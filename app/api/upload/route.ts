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

export const runtime = "nodejs";

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

/**
 * Validate file type against allowed types
 */
function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
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
    console.log('[POST /api/upload] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      console.log('[POST /api/upload] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

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
    const contentType = file.type || "application/octet-stream";
    if (!isAllowedFileType(contentType)) {
      return NextResponse.json(
        { error: `File type ${contentType} is not allowed` },
        { status: 415 }
      );
    }

    // SECURITY: Check if user can modify this project
    const canModify = await canModifyProject(userId, projectId);
    if (!canModify) {
      console.log('[POST /api/upload] User not authorized to modify project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to upload files to this project' },
        { status: 403 }
      );
    }

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

    console.log("[POST /api/upload] Uploading file:", {
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

    console.log("[POST /api/upload] File uploaded to:", data.path);

    // Generate signed URL for secure access
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS);

    if (signError) {
      console.warn("[POST /api/upload] Signed URL error:", signError);
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
