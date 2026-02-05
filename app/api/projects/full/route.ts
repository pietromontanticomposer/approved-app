// app/api/projects/full/route.ts
/**
 * FAST AGGREGATED PROJECT ENDPOINT
 *
 * Loads everything in ONE database query instead of N+1 cascading fetches:
 * - Projects
 * - Cues per project
 * - Versions per cue
 * - Comments per version
 * - References per project
 *
 * This reduces ~50-200 HTTP requests down to 1 request.
 */

import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';
import { getShareLinkContext } from '@/lib/shareAccess';
import { isUuid } from '@/lib/validation';

const isDev = process.env.NODE_ENV !== "production";

export async function GET(req: NextRequest) {
  try {
    if (isDev) console.log('[GET /api/projects/full] Fast aggregated load started');
    const startTime = Date.now();
    const url = new URL(req.url);
    const projectIdFilter = url.searchParams.get('projectId') || null;

    const shareContext = await getShareLinkContext(req, projectIdFilter || undefined);

    // SECURITY: Verify authentication (share links can bypass auth)
    const auth = await verifyAuth(req);
    if (!auth && !shareContext) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth?.userId || null;

    // Step 1: Get user's projects (owned + shared) IN PARALLEL
    let baseProjects: any[] = [];
    if (projectIdFilter) {
      if (isDev) console.log(`[GET /api/projects/full] Single project mode for`, projectIdFilter);
      const { data: singleProject, error: singleError } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', projectIdFilter)
        .maybeSingle();

      if (singleError || !singleProject) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      let hasAccess = !!(userId && singleProject.owner_id === userId);

      if (!hasAccess && shareContext && shareContext.projectId === singleProject.id) {
        hasAccess = true;
      }

      if (!hasAccess) {
        if (userId) {
          // Check project_members
          const { data: membership } = await supabaseAdmin
            .from('project_members')
            .select('project_id')
            .eq('project_id', singleProject.id)
            .eq('member_id', userId)
            .maybeSingle();
          if (membership) hasAccess = true;
        }
      }

      // Also check team_members if project has a team
      if (!hasAccess && userId && singleProject.team_id) {
        const { data: teamMembership } = await supabaseAdmin
          .from('team_members')
          .select('team_id')
          .eq('team_id', singleProject.team_id)
          .eq('user_id', userId)
          .maybeSingle();
        if (teamMembership) hasAccess = true;
      }

      if (!hasAccess) {
        if (isDev) console.log(`[GET /api/projects/full] User ${userId} denied for project ${projectIdFilter}`);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      baseProjects = [singleProject];
    } else {
      if (shareContext && !userId) {
        const { data: shareProject } = await supabaseAdmin
          .from('projects')
          .select('*')
          .eq('id', shareContext.projectId)
          .maybeSingle();
        baseProjects = shareProject ? [shareProject] : [];
      } else {
      // Load owned projects, project memberships, and team memberships in parallel
      const [
        { data: ownedProjects },
        { data: membershipRows },
        { data: teamMembershipRows }
      ] = await Promise.all([
        supabaseAdmin
          .from('projects')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('project_members')
          .select('project_id')
          .eq('member_id', userId),
        supabaseAdmin
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)
      ]);

      const ownedProjectIds = new Set((ownedProjects || []).map(p => p.id));
      const sharedProjectIds = (membershipRows || []).map(r => r.project_id).filter(Boolean);

      // Get projects from teams where user is a member
      const userTeamIds = (teamMembershipRows || []).map(r => r.team_id).filter(Boolean);
      let teamProjectIds: string[] = [];
      if (userTeamIds.length > 0) {
        const { data: teamProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .in('team_id', userTeamIds);
        teamProjectIds = (teamProjects || []).map(p => p.id).filter(Boolean);
      }

      // Combine all shared project IDs (excluding owned)
      const allSharedIds = new Set([...sharedProjectIds, ...teamProjectIds]);
      const finalSharedIds = Array.from(allSharedIds).filter(id => !ownedProjectIds.has(id));

      let sharedProjects: any[] = [];
      if (finalSharedIds.length > 0) {
        const { data } = await supabaseAdmin
          .from('projects')
          .select('*')
          .in('id', finalSharedIds)
          .order('created_at', { ascending: false });
        sharedProjects = data || [];
      }

        baseProjects = [...(ownedProjects || []), ...sharedProjects];
      }
    }

    const projectIds = baseProjects.map(p => p.id);
    if (projectIds.length === 0) {
      if (isDev) console.log(`[GET /api/projects/full] No projects found (${Date.now() - startTime}ms)`);
      return NextResponse.json({ projects: [] }, { status: 200 });
    }

    // Step 2: Load ALL data in PARALLEL for maximum speed
    const [
      { data: allCues },
      { data: refRoots },
      { data: projectNotes }
    ] = await Promise.all([
      supabaseAdmin
        .from('cues')
        .select('*')
        .in('project_id', projectIds)
        .order('index_in_project', { ascending: true }),
      supabaseAdmin
        .from('reference_roots')
        .select('*')
        .in('project_id', projectIds),
      supabaseAdmin
        .from('project_notes')
        .select('*')
        .in('project_id', projectIds)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
    ]);

    const cueIds = (allCues || []).map(c => c.id);

    // Step 3: Load versions, comments, and reference versions in PARALLEL
    const versionsPromise = cueIds.length > 0
      ? supabaseAdmin.from('versions').select('*').in('cue_id', cueIds).order('index_in_cue', { ascending: true })
      : Promise.resolve({ data: [] });

    const refVersionsPromise = (refRoots && refRoots.length > 0)
      ? supabaseAdmin.from('reference_versions').select('*').in('root_id', refRoots.map(r => r.id))
      : Promise.resolve({ data: [] });

    const [
      { data: allVersionsRaw },
      { data: refVersions }
    ] = await Promise.all([versionsPromise, refVersionsPromise]);

    let versionFiles: any[] = [];
    const versionIdsForFiles = (allVersionsRaw || []).map(v => v.id);
    if (versionIdsForFiles.length > 0) {
      const { data } = await supabaseAdmin
        .from('version_files')
        .select('*')
        .in('version_id', versionIdsForFiles);
      versionFiles = data || [];
    }

    // Don't resolve URLs here - let the client proxy storage paths when needed
    const normalizePath = (value: string | null) =>
      value ? value.replace(/^\/+/, "") : null;

    const extractStoragePathFromUrl = (raw: string | null): string | null => {
      if (!raw || typeof raw !== "string") return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("/api/media/stream")) {
        try {
          const u = new URL(trimmed, "http://localhost");
          const rawPath = u.searchParams.get("path");
          if (rawPath) return rawPath;
          const rawUrl = u.searchParams.get("url");
          if (rawUrl) return extractStoragePathFromUrl(rawUrl);
        } catch {
          return null;
        }
      }

      try {
        const u = new URL(trimmed);
        const parts = u.pathname.split("/").filter(Boolean);
        const objIdx = parts.findIndex(p => p === "object");
        if (objIdx >= 0) {
          const after = parts.slice(objIdx + 1);
          if (after.length >= 3 && (after[0] === "public" || after[0] === "sign") && after[1]) {
            const bucket = after[1];
            const pathParts = after.slice(2);
            return `${bucket}/${pathParts.join("/")}`;
          }
        }
      } catch {
        // ignore parse failures
      }

      if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return null;
      if (trimmed.includes("://")) return null;
      return trimmed;
    };

    const sanitizeMediaUrl = (raw: string | null) => {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return null;
      return trimmed;
    };

    // Helper to detect media type from filename
    const detectMediaType = (filename: string | null): 'audio' | 'video' | null => {
      if (!filename) return null;
      const lower = filename.toLowerCase();
      if (/\.(mp3|wav|aiff|aif|flac|aac|m4a|ogg|oga|opus)$/.test(lower)) return 'audio';
      if (/\.(mp4|mov|mkv|webm|avi|m4v)$/.test(lower)) return 'video';
      return null;
    };

    const versionFilesByVersion = versionFiles.reduce((acc, file) => {
      if (!acc[file.version_id]) acc[file.version_id] = [];
      acc[file.version_id].push({
        id: file.id,
        name: file.name,
        type: file.type,
        url: file.url,
        size: file.size
      });
      return acc;
    }, {} as Record<string, any[]>);

    const allVersions = (allVersionsRaw || []).map(v => {
      const rawMediaUrl = typeof v.media_url === "string" ? v.media_url : null;
      const storagePath =
        normalizePath(v.media_storage_path) ||
        normalizePath(extractStoragePathFromUrl(rawMediaUrl));
      const mediaUrl = storagePath || sanitizeMediaUrl(rawMediaUrl);

      const rawThumbUrl = typeof v.media_thumbnail_url === "string" ? v.media_thumbnail_url : null;
      const thumbPath =
        normalizePath(v.media_thumbnail_path) ||
        normalizePath(extractStoragePathFromUrl(rawThumbUrl));
      const thumbnailUrl = thumbPath || sanitizeMediaUrl(rawThumbUrl);

      // Infer media_type if missing - use storagePath (which may be extracted from URL)
      // instead of v.media_storage_path (raw DB value that may be NULL)
      let mediaType = v.media_type;
      if (!mediaType) {
        mediaType = detectMediaType(v.media_original_name) ||
                   detectMediaType(storagePath) ||
                   detectMediaType(v.media_display_name) ||
                   detectMediaType(mediaUrl);
      }

      return {
        ...v,
        media_type: mediaType,
        media_filename: v.media_original_name || v.media_display_name || "Media",
        media_url: mediaUrl,
        media_thumbnail_url: thumbnailUrl,
        media_storage_path: storagePath,
        media_thumbnail_path: thumbPath
      };
    });

    const versionIds = allVersions.map(v => v.id);

    // Load approvals and delivery configs
    const approvalsPromise = versionIds.length > 0
      ? supabaseAdmin.from('version_approvals').select('*').in('version_id', versionIds)
      : Promise.resolve({ data: [] });

    const deliveriesPromise = versionIds.length > 0
      ? supabaseAdmin.from('version_deliveries').select('*').in('version_id', versionIds)
      : Promise.resolve({ data: [] });

    const cueSheetProjectsPromise = projectIds.length > 0
      ? supabaseAdmin.from('cue_sheet_projects').select('*').in('project_id', projectIds)
      : Promise.resolve({ data: [] });

    const cueSheetEntriesPromise = cueIds.length > 0
      ? supabaseAdmin.from('cue_sheet_entries').select('*').in('cue_id', cueIds)
      : Promise.resolve({ data: [] });

    // Step 4: Load comments (only if we have versions)
    let allComments = [];
    let approvals: any[] = [];
    let deliveries: any[] = [];
    let cueSheetProjects: any[] = [];
    let cueSheetEntries: any[] = [];

    if (versionIds.length > 0) {
      const [
        { data: commentsData },
        { data: approvalsData },
        { data: deliveriesData },
        { data: cueSheetProjectsData },
        { data: cueSheetEntriesData }
      ] = await Promise.all([
        supabaseAdmin
          .from('comments')
          .select('*')
          .in('version_id', versionIds)
          .order('time_seconds', { ascending: true }),
        approvalsPromise,
        deliveriesPromise,
        cueSheetProjectsPromise,
        cueSheetEntriesPromise
      ]);

      allComments = commentsData || [];
      approvals = approvalsData || [];
      deliveries = deliveriesData || [];
      cueSheetProjects = cueSheetProjectsData || [];
      cueSheetEntries = cueSheetEntriesData || [];
    } else {
      const [{ data: cueSheetProjectsData }, { data: cueSheetEntriesData }] = await Promise.all([
        cueSheetProjectsPromise,
        cueSheetEntriesPromise
      ]);
      cueSheetProjects = cueSheetProjectsData || [];
      cueSheetEntries = cueSheetEntriesData || [];
    }

    // Process references
    let allReferences = [];
    if (refRoots && refRoots.length > 0) {

      // Group versions by root
      const versionsByRoot = (refVersions || []).reduce((acc, v) => {
        if (!acc[v.root_id]) acc[v.root_id] = [];
        acc[v.root_id].push(v);
        return acc;
      }, {} as Record<string, any[]>);

      allReferences = refRoots.map((root) => ({
        id: root.id,
        name: root.name,
        project_id: root.project_id,
        active_version_index: root.active_version_index || 0,
        versions: (versionsByRoot[root.id] || []).map((v) => {
          // Provide raw storage path when a public URL is not available so the client can proxy it
          let refUrl = v.url;
          if (!refUrl && v.path) {
            refUrl = v.path.replace(/^\/+/, '');
          }

          let refThumbUrl = v.thumbnail_url;
          if (!refThumbUrl && v.thumbnail_path) {
            refThumbUrl = v.thumbnail_path.replace(/^\/+/, '');
          }

          return {
            id: v.id,
            name: v.name,
            type: v.type,
            url: refUrl,
            size: v.size,
            duration: v.duration,
            thumbnail_url: refThumbUrl,
            waveform: v.waveform_data
          };
        })
      }));
    }

    // Step 6: Assemble the data structure
    // Group comments by version
    const commentsByVersion = allComments.reduce((acc, c) => {
      if (!acc[c.version_id]) acc[c.version_id] = [];
      acc[c.version_id].push({
        id: c.id,
        time: c.time_seconds,
        author: c.author || 'Client',
        actorId: c.actor_id,
        text: c.text || '',
        audio_url: c.audio_url || null,
        created_at: c.created_at
      });
      return acc;
    }, {} as Record<string, any[]>);

    const approvalsByVersion = (approvals || []).reduce((acc, row) => {
      if (row.version_id) acc[row.version_id] = row;
      return acc;
    }, {} as Record<string, any>);

    const deliveriesByVersion = (deliveries || []).reduce((acc, row) => {
      if (row.version_id) acc[row.version_id] = row;
      return acc;
    }, {} as Record<string, any>);

    const cueSheetByCue = (cueSheetEntries || []).reduce((acc, row) => {
      if (row.cue_id) acc[row.cue_id] = row;
      return acc;
    }, {} as Record<string, any>);

    const cueSheetProjectByProject = (cueSheetProjects || []).reduce((acc, row) => {
      if (row.project_id) acc[row.project_id] = row;
      return acc;
    }, {} as Record<string, any>);

    // Group versions by cue
    const versionsByCue = allVersions.reduce((acc, v) => {
      if (!acc[v.cue_id]) acc[v.cue_id] = [];
      acc[v.cue_id].push({
        id: v.id,
        index: v.index_in_cue || 0,
        status: v.status || 'in_review',
        media: v.media_type ? {
          type: v.media_type,
          url: v.media_url,
          storagePath: v.media_storage_path || null,
          originalName: v.media_filename || v.media_original_name || 'Media',
          displayName: v.media_display_name || v.media_original_name || 'Media',
          duration: v.media_duration || v.duration,
          thumbnailUrl: v.media_thumbnail_url,
          thumbnailPath: v.media_thumbnail_path || null,
          thumbnailSaved: !!v.media_thumbnail_url,
          waveform: v.media_waveform_data || null,
          waveformSaved: !!v.media_waveform_data,
          waveformImageUrl: v.media_waveform_image_url || null,
          waveformImageSaved: !!v.media_waveform_image_url
        } : null,
        referenceVideo: (v.reference_video_storage_path || v.reference_video_url) ? {
          storagePath: v.reference_video_storage_path || null,
          url: v.reference_video_url || null,
          displayName: v.reference_video_display_name || null,
          offsetMs: v.reference_video_offset_ms || 0,
          startTimecode: v.reference_video_start_tc || null,
          duration: v.reference_video_duration || null
        } : null,
        approval: approvalsByVersion[v.id] || null,
        delivery: deliveriesByVersion[v.id] || null,
        comments: commentsByVersion[v.id] || [],
        deliverables: versionFilesByVersion[v.id] || []
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Group cues by project
    const cuesByProject = (allCues || []).reduce((acc, c) => {
      if (!acc[c.project_id]) acc[c.project_id] = [];
      acc[c.project_id].push({
        id: c.id,
        index: c.index_in_project || 0,
        originalName: c.name || 'Untitled',
        name: c.name || 'Untitled',
        displayName: c.display_name || '',
        maxRevisions: typeof c.max_revisions === "number" ? c.max_revisions : null,
        status: c.status || 'in_review',
        versions: versionsByCue[c.id] || [],
        cueSheet: cueSheetByCue[c.id] || null,
        isOpen: true
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Group references by project
    const referencesByProject = allReferences.reduce((acc, ref) => {
      if (!acc[ref.project_id]) acc[ref.project_id] = [];
      acc[ref.project_id].push(ref);
      return acc;
    }, {} as Record<string, any[]>);

    // Group project-level notes (type general) by project
    const notesByProject = (projectNotes || []).reduce((acc, note) => {
      if (note.cue_id) return acc;
      if (!acc[note.project_id]) acc[note.project_id] = [];
      acc[note.project_id].push(note);
      return acc;
    }, {} as Record<string, any[]>);

    // Group cue notes (records tied to a cue_id) by project and cue
    const cueNotesByProject = (projectNotes || []).reduce((acc, note) => {
      if (!note.cue_id) return acc;
      if (!acc[note.project_id]) acc[note.project_id] = {};
      if (!acc[note.project_id][note.cue_id]) acc[note.project_id][note.cue_id] = [];
      acc[note.project_id][note.cue_id].push(note);
      return acc;
    }, {} as Record<string, Record<string, any[]>>);

    // Compute roles for current user or share link
    const roleByProject = new Map<string, string>();
    const teamRoleByTeam = new Map<string, string>();
    if (userId && isUuid(userId)) {
      const { data: membershipRows } = await supabaseAdmin
        .from('project_members')
        .select('project_id, role')
        .eq('member_id', userId)
        .in('project_id', projectIds);
      (membershipRows || []).forEach((row: any) => {
        if (row?.project_id) roleByProject.set(row.project_id, row.role || '');
      });

      const teamIds = Array.from(new Set(baseProjects.map(p => p.team_id).filter(Boolean))) as string[];
      if (teamIds.length > 0) {
        const { data: teamRows } = await supabaseAdmin
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', userId)
          .in('team_id', teamIds);
        (teamRows || []).forEach((row: any) => {
          if (row?.team_id) teamRoleByTeam.set(row.team_id, row.role || '');
        });
      }
    }

    if (shareContext && shareContext.projectId && !roleByProject.get(shareContext.projectId)) {
      roleByProject.set(shareContext.projectId, shareContext.role);
    }

    const normalizeRole = (role: string | null | undefined) => {
      if (!role) return null;
      const lower = String(role).toLowerCase();
      if (lower === 'owner') return 'owner';
      if (lower === 'editor') return 'editor';
      if (lower === 'commenter') return 'commenter';
      if (lower === 'viewer') return 'viewer';
      if (lower === 'view') return 'viewer';
      if (lower === 'manage') return 'editor';
      if (lower === 'contribute') return 'commenter';
      return null;
    };

    // Assemble final projects structure
    const enrichedProjects = baseProjects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: project.created_at,
      updated_at: project.updated_at,
      owner_id: project.owner_id,
      team_id: project.team_id,
      cues: cuesByProject[project.id] || [],
      references: referencesByProject[project.id] || [],
      notes: notesByProject[project.id] || [],
      cueNotes: cueNotesByProject[project.id] || {},
      cueSheetProject: cueSheetProjectByProject[project.id] || null,
      project_role: project.owner_id && userId && project.owner_id === userId
        ? 'owner'
        : normalizeRole(roleByProject.get(project.id) || '') ||
          normalizeRole(teamRoleByTeam.get(project.team_id || '') || '')
    }));

    const elapsed = Date.now() - startTime;
    if (isDev) {
      console.log(`[GET /api/projects/full] ✅ Loaded ${enrichedProjects.length} projects with all data in ${elapsed}ms`);
      console.log(`  - Total cues: ${allCues?.length || 0}`);
      console.log(`  - Total versions: ${allVersions.length}`);
      console.log(`  - Total comments: ${allComments.length}`);
      console.log(`  - Total references: ${allReferences.length}`);
    }
    const totalCueNotes = (projectNotes || []).filter(n => !!n.cue_id).length;
    if (isDev) {
      console.log(`  - Total project notes: ${projectNotes?.length || 0}`);
      console.log(`  - Total cue notes: ${totalCueNotes}`);
    }

    return NextResponse.json({
      projects: enrichedProjects,
      _meta: {
        elapsed_ms: elapsed,
        project_count: enrichedProjects.length,
        cue_count: allCues?.length || 0,
        version_count: allVersions.length,
        comment_count: allComments.length,
        reference_count: allReferences.length
      }
    }, { status: 200 });

  } catch (err: any) {
    console.error('[GET /api/projects/full] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
