import { NextResponse, NextRequest } from "next/server";
import path from "path";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { sendNewVersionNotification, UploadType } from "@/lib/email";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

function getExtension(value: string): string {
  const base = value.split("/").pop()?.split("\\").pop() || "";
  return path.extname(base).toLowerCase();
}

function normalizeContentType(contentType: string, ext: string): string {
  if (contentType && ALLOWED_MIME_TYPES.includes(contentType)) return contentType;
  if (ext && MIME_BY_EXTENSION[ext]) return MIME_BY_EXTENSION[ext];
  return "";
}

async function notifyCollaborators(
  projectId: string,
  uploaderId: string,
  fileName: string,
  uploadType: UploadType
) {
  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("name, owner_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.warn("[Notification] Project not found:", projectId);
      return;
    }

    const { data: uploaderAuth } = await supabaseAdmin.auth.admin.getUserById(uploaderId);
    const uploaderName =
      uploaderAuth?.user?.user_metadata?.name ||
      uploaderAuth?.user?.email ||
      "Un membro del team";

    const { data: members, error: membersError } = await supabaseAdmin
      .from("project_members")
      .select("member_id, role")
      .eq("project_id", projectId)
      .neq("member_id", uploaderId);

    if (membersError) {
      console.error("[Notification] Failed to fetch members:", membersError);
      return;
    }

    if (!members || members.length === 0) {
      return;
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://approved-app-eight.vercel.app";
    const projectLink = `${appUrl}/?project=${projectId}`;

    const emailPromises = members.map(async (member: any) => {
      const memberId = member.member_id;
      if (!memberId) return;

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
        memberId
      );
      if (authError || !authUser?.user?.email) {
        return;
      }

      const email = authUser.user.email;

      try {
        await sendNewVersionNotification(
          email,
          project.name || "Progetto senza nome",
          fileName,
          uploaderName,
          projectLink,
          uploadType
        );
      } catch (err) {
        console.error("[Notification] Failed to send email to", email, ":", err);
      }
    });

    await Promise.allSettled(emailPromises);
  } catch (err) {
    console.error("[Notification] Error in notifyCollaborators:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const projectId = body?.projectId;
    const storagePath = body?.path;
    const filename = body?.filename;
    const contentType = body?.contentType;
    const size = body?.size;

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "size is required" }, { status: 400 });
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const safeContentType = typeof contentType === "string" ? contentType : "";
    const ext = getExtension(filename);
    const normalizedType = normalizeContentType(safeContentType, ext);

    if (!normalizedType || !ALLOWED_MIME_TYPES.includes(normalizedType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
    }

    const expectedPrefix = `projects/${projectId}/${auth.userId}/`;
    const normalizedPath = storagePath.replace(/^\/+/, "");

    if (!normalizedPath.startsWith(expectedPrefix) || normalizedPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const pathExt = getExtension(normalizedPath);
    if (pathExt && !ALLOWED_EXTENSIONS.has(pathExt)) {
      return NextResponse.json({ error: "File extension not allowed" }, { status: 415 });
    }

    // Log audit entry (non-blocking - don't fail upload if audit fails)
    try {
      const { error: insertError } = await supabaseAdmin.from("audit_logs").insert({
        actor_id: auth.userId || null,
        action: "upload_completed",
        target_type: "project",
        target_id: projectId,
        meta: {
          path: normalizedPath,
          filename,
          content_type: normalizedType,
          size,
        },
      });

      if (insertError) {
        console.error("[POST /api/upload-complete] Audit log insert error (non-fatal):", insertError);
      }
    } catch (auditErr) {
      console.error("[POST /api/upload-complete] Audit log exception (non-fatal):", auditErr);
    }

    notifyCollaborators(projectId, auth.userId, filename, "unknown").catch((err) => {
      console.error("[POST /api/upload-complete] notify failed:", err);
    });

    return NextResponse.json({ success: true, path: normalizedPath }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/upload-complete] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
