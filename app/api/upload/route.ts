// app/api/upload/route.ts
/**
 * File Upload API Route
 *
 * CRITICAL SECURITY:
 * - Server-side authentication verification
 * - Project access authorization checks
 * - File type validation
 * - File size limits
 * - Path sanitization
 * - Error handling
 */

import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canModifyProject } from '@/lib/auth';
import { sendNewVersionNotification } from '@/lib/email';

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200",
  10
);

// Security limits
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_MIME_TYPES = [
  // Video
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-pn-wav',
  'audio/aiff',
  'audio/x-aiff',
  'audio/aac',
  'audio/mp4',
  'audio/ogg',
  'audio/flac',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  // Archives / generic
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/octet-stream',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/_+/g, '_')
    .slice(0, 255);
}

const ALLOWED_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.mkv',
  '.avi',
  '.webm',
  '.m4v',
  '.mp3',
  '.wav',
  '.aif',
  '.aiff',
  '.flac',
  '.aac',
  '.m4a',
  '.ogg',
  '.oga',
  '.opus',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.pdf',
  '.txt',
  '.zip',
  '.rar',
  '.7z'
]);

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return '';
  return filename.slice(idx).toLowerCase();
}

function guessMimeType(ext: string): string {
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.mkv':
      return 'video/x-matroska';
    case '.avi':
      return 'video/x-msvideo';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.aif':
    case '.aiff':
      return 'audio/aiff';
    case '.flac':
      return 'audio/flac';
    case '.aac':
      return 'audio/aac';
    case '.m4a':
      return 'audio/mp4';
    case '.ogg':
    case '.oga':
    case '.opus':
      return 'audio/ogg';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.txt':
      return 'text/plain';
    case '.zip':
      return 'application/zip';
    case '.rar':
      return 'application/vnd.rar';
    case '.7z':
      return 'application/x-7z-compressed';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Validate file type against allowed types
 */
function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Send email notifications to all collaborators of a project
 * This runs asynchronously and doesn't block the upload response
 */
type UploadType = 'new_cue' | 'new_version' | 'deliverable' | 'unknown';

async function notifyCollaborators(
  projectId: string,
  uploaderId: string,
  fileName: string,
  uploadType: UploadType = 'unknown',
  cueName?: string
) {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('name, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.warn('[Notification] Project not found:', projectId);
      return;
    }

    // Get uploader name from Supabase Auth
    const { data: uploaderAuth } = await supabaseAdmin.auth.admin.getUserById(uploaderId);
    const uploaderName = uploaderAuth?.user?.user_metadata?.name || uploaderAuth?.user?.email || 'Un membro del team';

    // Get all collaborators (project_members) except the uploader
    // This determines if project is "shared" - if there are members besides the uploader
    const { data: members, error: membersError } = await supabaseAdmin
      .from('project_members')
      .select('member_id, role')
      .eq('project_id', projectId)
      .neq('member_id', uploaderId);

    if (membersError) {
      console.error('[Notification] Failed to fetch members:', membersError);
      return;
    }

    if (!members || members.length === 0) {
      console.log('[Notification] No collaborators to notify for project:', projectId);
      return;
    }

    console.log('[Notification] Found', members.length, 'collaborators to notify for project:', projectId);

    // Build project link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://approved-app-eight.vercel.app';
    const projectLink = `${appUrl}/?project=${projectId}`;

    // Send email to each collaborator
    const emailPromises = members.map(async (member: any) => {
      const memberId = member.member_id;
      if (!memberId) return;

      // Get user email from Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(memberId);
      if (authError || !authUser?.user?.email) {
        console.warn('[Notification] Could not find email for member:', memberId);
        return;
      }

      const email = authUser.user.email;

      try {
        await sendNewVersionNotification(
          email,
          project.name || 'Progetto senza nome',
          fileName,
          uploaderName,
          projectLink,
          uploadType,
          cueName
        );
        console.log('[Notification] Email sent to:', email);
      } catch (err) {
        console.error('[Notification] Failed to send email to', email, ':', err);
      }
    });

    await Promise.allSettled(emailPromises);
    console.log(`[Notification] Sent ${emailPromises.length} notification emails for project ${projectId}`);

  } catch (err) {
    console.error('[Notification] Error in notifyCollaborators:', err);
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * POST /api/upload
 *
 * Uploads a file to Supabase storage
 * Requires: Authentication + project modify permission
 * FormData: file, projectId, cueId?, versionId?
 * Returns: { success: true, path: string, mediaUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/upload] Request started');

    // SECURITY: Verify authentication
    const authHeader = req.headers.get('authorization');
    console.log('[POST /api/upload] Auth header present:', !!authHeader);

    const auth = await verifyAuth(req);
    if (!auth) {
      console.error('[POST /api/upload] Unauthorized - no valid auth token');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    console.log('[POST /api/upload] Authenticated user:', auth.userId);

    const userId = auth.userId;

    // Parse form data
    let form: FormData;
    try {
      form = await req.formData();
    } catch (err) {
      console.error('[POST /api/upload] Invalid form data:', err);
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const file = form.get("file") as File | null;
    const projectId = form.get("projectId") as string | null;
    const cueId = form.get("cueId") as string | null;
    const versionId = form.get("versionId") as string | null;
    const uploadType = form.get("uploadType") as string | null; // 'new_cue', 'new_version', 'deliverable'
    const cueName = form.get("cueName") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    if (!isUuid(projectId)) {
      return NextResponse.json(
        { error: "projectId must be a valid UUID" },
        { status: 400 }
      );
    }

    // Validate optional UUIDs
    if (cueId && !isUuid(cueId)) {
      return NextResponse.json(
        { error: "cueId must be a valid UUID" },
        { status: 400 }
      );
    }

    if (versionId && !isUuid(versionId)) {
      return NextResponse.json(
        { error: "versionId must be a valid UUID" },
        { status: 400 }
      );
    }

    // SECURITY: Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // SECURITY: Validate file type
    let contentType = file.type || "application/octet-stream";
    if (!isAllowedFileType(contentType)) {
      const ext = getExtension(file.name || "");
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `File type ${contentType} is not allowed` },
          { status: 415 }
        );
      }
      contentType = guessMimeType(ext);
    }

    // SECURITY: Check if user can modify this project
    const canModify = await canModifyProject(userId, projectId);
    console.log('[POST /api/upload] Permission check:', { userId, projectId, canModify });

    if (!canModify) {
      const errorMsg = `User ${userId} forbidden from uploading to project ${projectId}`;
      console.error('[POST /api/upload] FORBIDDEN:', errorMsg);
      return NextResponse.json(
        { error: `Forbidden - you do not have permission to upload files to this project. User: ${userId}, Project: ${projectId}` },
        { status: 403 }
      );
    }

    console.log('[POST /api/upload] Permission check PASSED');

    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name || `upload-${Date.now()}`);

    // Read file data
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create secure path based on project/cue/version structure
    let folder = `projects/${projectId}`;
    if (cueId && versionId) {
      folder = `projects/${projectId}/cues/${cueId}/versions/${versionId}`;
    } else if (cueId) {
      folder = `projects/${projectId}/cues/${cueId}`;
    }

    const timestamp = Date.now();
    const path = `${folder}/${timestamp}-${sanitizedName}`;

    if (isDev) console.log("[POST /api/upload] Uploading file:", {
      path,
      size: file.size,
      type: contentType,
      projectId,
      cueId,
      versionId,
    });

    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error("[POST /api/upload] Supabase storage error:", error);
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log("[POST /api/upload] File uploaded to:", data.path);

    // Generate signed URL for secure access
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS);

    if (signError) {
    if (isDev) console.warn("[POST /api/upload] Signed URL error:", signError);
      // Fallback to public URL (less secure but functional)
      const { data: publicData } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return NextResponse.json({
        success: true,
        path: data.path,
        mediaUrl: publicData?.publicUrl,
      }, { status: 201 });
    }

    // Send email notifications to collaborators (fire and forget - don't block response)
    const resolvedUploadType = (uploadType as UploadType) || 'unknown';
    notifyCollaborators(projectId, userId, file.name, resolvedUploadType, cueName || undefined).catch(err => {
      console.error('[POST /api/upload] Failed to notify collaborators:', err);
    });

    return NextResponse.json({
      success: true,
      path: data.path,
      mediaUrl: signedData?.signedUrl,
    }, { status: 201 });

  } catch (err: any) {
    console.error("[POST /api/upload] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
