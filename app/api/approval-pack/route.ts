import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanAccess } from '@/lib/shareAccess';
import { resolveMediaUrl } from '@/lib/mediaUrlResolver';
import { formatTimecode, parseTimecodeToSeconds, secondsWithOffset } from '@/lib/timecode';
import { buildSimplePdf } from '@/lib/pdf';
import { createZip } from '@/lib/zip';
import { sha256FromUrl } from '@/lib/hash';

export const runtime = 'nodejs';

function csvEscape(value: string) {
  const safe = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${safe}"`;
}

async function getUserDisplayName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const meta = (userData?.user?.user_metadata || {}) as any;
    const first = meta.first_name || meta.firstName || meta.first || '';
    const last = meta.last_name || meta.lastName || meta.last || '';
    const display = meta.display_name || meta.full_name || `${first} ${last}`.trim();
    return display || userData?.user?.email || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const versionId = typeof body.versionId === 'string' ? body.versionId : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const includeMedia = body.include_media === true;
    const includeVoice = body.include_voice === true;
    const fps = Number(body.fps || 25);
    const startTc = typeof body.start_timecode === 'string' ? body.start_timecode : '00:00:00.000';

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid versionId required' }, { status: 400 });
    }
    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: version } = await supabaseAdmin
      .from('versions')
      .select('id, status, index_in_cue, media_storage_path, media_url, media_original_name, media_display_name, cues(id, name, display_name, project_id, projects(id, name))')
      .eq('id', versionId)
      .single();

    const cue = (version as any)?.cues || null;
    const project = cue?.projects || null;
    const resolvedProjectId = cue?.project_id || null;

    if (!resolvedProjectId || resolvedProjectId !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (String(version?.status) !== 'approved') {
      return NextResponse.json({ error: 'Approval pack only available for approved versions' }, { status: 400 });
    }

    let approval = null;
    const { data: approvalRow } = await supabaseAdmin
      .from('version_approvals')
      .select('*')
      .eq('version_id', versionId)
      .maybeSingle();

    approval = approvalRow;

    let mediaHash = approval?.media_hash || null;
    const mediaPath = (version as any)?.media_storage_path || (version as any)?.media_url || null;
    const mediaUrl = mediaPath ? await resolveMediaUrl(mediaPath) : null;

    if (!approval) {
      const { data: inserted } = await supabaseAdmin
        .from('version_approvals')
        .insert({
          version_id: versionId,
          project_id: projectId,
          approved_by: access.userId || null,
          approved_at: new Date().toISOString(),
          approval_note: null,
          changelog: null,
          media_hash: null,
          media_hash_alg: 'sha256'
        })
        .select()
        .single();
      approval = inserted || null;
    }

    if (!mediaHash && mediaUrl) {
      try {
        mediaHash = await sha256FromUrl(mediaUrl);
        await supabaseAdmin
          .from('version_approvals')
          .update({ media_hash: mediaHash })
          .eq('version_id', versionId);
      } catch (err) {
        console.warn('[ApprovalPack] Failed to compute hash', err);
      }
    }

    const approvedByName = await getUserDisplayName(approval?.approved_by || null);
    const approvedAt = approval?.approved_at || new Date().toISOString();
    const cueName = cue?.display_name || cue?.name || 'Cue';
    const projectName = project?.name || 'Project';
    const versionLabel = `v${(version as any)?.index_in_cue != null ? (Number((version as any).index_in_cue) + 1) : ''}`;

    const pdfLines = [
      `Project: ${projectName}`,
      `Cue: ${cueName}`,
      `Version: ${versionLabel}`,
      `Approved by: ${approvedByName || approval?.approved_by || 'Unknown'}`,
      `Approved at: ${approvedAt}`,
      mediaHash ? `Media hash (SHA-256): ${mediaHash}` : 'Media hash: unavailable',
      '',
      'Declaration:',
      'This is the approved version of the cue for delivery.',
      '',
      approval?.approval_note ? `Approval note: ${approval.approval_note}` : 'Approval note: (none)',
      approval?.changelog ? `Changelog: ${approval.changelog}` : 'Changelog: (none)'
    ];

    const pdfBuffer = buildSimplePdf(pdfLines, { title: 'Approval Certificate' });

    const { data: comments } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('version_id', versionId)
      .order('time_seconds', { ascending: true });

    const offsetSeconds = parseTimecodeToSeconds(startTc, fps);
    const csvHeader = ['time_seconds', 'timecode_hh:mm:ss.ms', 'author', 'text', 'comment_id', 'voice_url'].join(',');
    const csvLines = await Promise.all(
      (comments || []).map(async (c: any) => {
        const baseSeconds = typeof c.time_seconds === 'number' ? c.time_seconds : 0;
        const timeSeconds = secondsWithOffset(baseSeconds, offsetSeconds);
        const timecode = formatTimecode(timeSeconds, fps);
        let voiceUrl = '';
        if (includeVoice && c.audio_url) {
          const resolved = await resolveMediaUrl(c.audio_url);
          voiceUrl = resolved || '';
        }
        return [
          String(timeSeconds.toFixed(3)),
          csvEscape(timecode),
          csvEscape(c.author || 'Client'),
          csvEscape(c.text || ''),
          csvEscape(c.id),
          csvEscape(includeVoice ? voiceUrl : '')
        ].join(',');
      })
    );

    const markersCsv = [csvHeader, ...csvLines].join('\n');
    const changelogText = approval?.changelog || 'No changelog provided.';

    const files: { name: string; data: Buffer | string }[] = [
      { name: 'approval_certificate.pdf', data: pdfBuffer },
      { name: 'markers.csv', data: markersCsv },
      { name: 'changelog.txt', data: changelogText }
    ];

    if (includeMedia && mediaUrl) {
      try {
        const mediaResp = await fetch(mediaUrl);
        if (!mediaResp.ok) throw new Error(`Media fetch failed (${mediaResp.status})`);
        const buf = Buffer.from(await mediaResp.arrayBuffer());
        const mediaName = (version as any)?.media_display_name || (version as any)?.media_original_name || 'media';
        files.push({ name: mediaName, data: buf });
      } catch (err) {
        files.push({ name: 'media_link.txt', data: mediaUrl });
      }
    } else if (mediaUrl) {
      files.push({ name: 'media_link.txt', data: mediaUrl });
    }

    const zip = new Uint8Array(createZip(files));
    const filename = `approval_pack_${projectName.replace(/\s+/g, '_')}_${cueName.replace(/\s+/g, '_')}_${versionLabel}.zip`;

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('[ApprovalPack] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
