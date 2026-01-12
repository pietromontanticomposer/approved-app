import { NextResponse, NextRequest } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canModifyProject } from "@/lib/auth";

export const runtime = "nodejs";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";

const ALLOWED_MIME_TYPES = [
  // Video
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/x-pn-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/aac",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "text/plain",
  // Archives / generic
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/octet-stream",
];

const ALLOWED_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".webm",
  ".m4v",
  ".mp3",
  ".wav",
  ".aif",
  ".aiff",
  ".flac",
  ".aac",
  ".m4a",
  ".ogg",
  ".oga",
  ".opus",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".pdf",
  ".txt",
  ".zip",
  ".rar",
  ".7z",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aif": "audio/aiff",
  ".aiff": "audio/aiff",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
};

const EXTENSION_BY_MIME: Record<string, string> = Object.entries(MIME_BY_EXTENSION).reduce(
  (acc, [ext, mime]) => {
    if (!acc[mime]) acc[mime] = ext;
    return acc;
  },
  {} as Record<string, string>
);

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

function getExtension(filename: string): string {
  const base = filename.split("/").pop()?.split("\\").pop() || "";
  return path.extname(base).toLowerCase();
}

function resolveExtension(filename: string, contentType: string): string {
  const ext = getExtension(filename);
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return ext;
  if (contentType && EXTENSION_BY_MIME[contentType]) return EXTENSION_BY_MIME[contentType];
  return "";
}

function normalizeContentType(contentType: string, ext: string): string {
  if (contentType && ALLOWED_MIME_TYPES.includes(contentType)) return contentType;
  if (ext && MIME_BY_EXTENSION[ext]) return MIME_BY_EXTENSION[ext];
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const projectId = body?.projectId;
    const filename = body?.filename;
    const contentType = body?.contentType;

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    // SECURITY: Check if user can modify this project (viewers cannot upload)
    const canModify = await canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: "Forbidden - viewers cannot upload files" }, { status: 403 });
    }

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    const safeContentType = typeof contentType === "string" ? contentType : "";
    const ext = resolveExtension(filename, safeContentType);
    const normalizedType = normalizeContentType(safeContentType, ext);

    if (!ext || !normalizedType || !ALLOWED_MIME_TYPES.includes(normalizedType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
    }

    const uploadPath = `projects/${projectId}/${auth.userId}/${randomUUID()}${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(uploadPath, { upsert: false });

    if (error || !data) {
      console.error("[POST /api/upload-url] createSignedUploadUrl error", error);
      return NextResponse.json({ error: "Failed to create signed upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      path: data.path || uploadPath,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (err: any) {
    console.error("[POST /api/upload-url] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
