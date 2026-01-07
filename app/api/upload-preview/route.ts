// app/api/upload-preview/route.ts
/**
 * Preview Image Upload API Route
 *
 * Uploads preview images (waveforms, thumbnails) to Supabase storage
 * and updates the version record with the preview URL.
 */

import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canModifyProject } from '@/lib/auth';

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/**
 * POST /api/upload-preview
 *
 * Uploads a preview image (waveform PNG or video thumbnail) to storage
 * and updates the version record.
 *
 * Body (JSON):
 * - versionId: UUID of the version
 * - projectId: UUID of the project
 * - previewType: "waveform" | "thumbnail"
 * - imageData: base64 encoded image data (data:image/png;base64,...)
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/upload-preview] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.userId;
    const body = await req.json();
    const { versionId, projectId, previewType, imageData } = body;

    // Validate inputs
    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid versionId required' }, { status: 400 });
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    if (!previewType || !['waveform', 'thumbnail'].includes(previewType)) {
      return NextResponse.json({ error: 'previewType must be "waveform" or "thumbnail"' }, { status: 400 });
    }

    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: 'imageData required' }, { status: 400 });
    }

    // SECURITY: Check project modify permission
    const canModify = await canModifyProject(userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse base64 image data
    const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
    }

    const imageFormat = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Limit file size (max 2MB for previews)
    if (buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Preview image too large (max 2MB)' }, { status: 413 });
    }

    // Create storage path
    const timestamp = Date.now();
    const extension = imageFormat === 'jpeg' || imageFormat === 'jpg' ? 'jpg' : imageFormat;
    const filename = `${previewType}-${timestamp}.${extension}`;
    const storagePath = `projects/${projectId}/previews/${versionId}/${filename}`;

    if (isDev) console.log('[POST /api/upload-preview] Uploading to:', storagePath);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: `image/${imageFormat}`,
        upsert: true,
        cacheControl: '31536000', // 1 year cache
      });

    if (uploadError) {
      console.error('[POST /api/upload-preview] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload preview' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const previewUrl = urlData?.publicUrl || storagePath;

    // Update version record based on preview type
    const updateField = previewType === 'waveform'
      ? { media_waveform_image_url: storagePath }
      : { media_thumbnail_url: storagePath, media_thumbnail_path: storagePath };

    const { error: updateError } = await supabaseAdmin
      .from('versions')
      .update(updateField)
      .eq('id', versionId);

    if (updateError) {
      console.error('[POST /api/upload-preview] DB update error:', updateError);
      // Don't fail - the image is uploaded, just couldn't update DB
    }

    if (isDev) console.log('[POST /api/upload-preview] Success:', { storagePath, previewType });

    return NextResponse.json({
      success: true,
      path: storagePath,
      url: previewUrl,
      previewType
    }, { status: 201 });

  } catch (err: any) {
    console.error('[POST /api/upload-preview] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
