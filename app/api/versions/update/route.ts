// app/api/versions/update/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';
import { resolveAccessContext, roleCanModify } from '@/lib/shareAccess';
import { isUuid } from '@/lib/validation';

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

function normalizeStatus(value: string | null) {
  if (!value) return value;
  if (value === "in-review") return "in_review";
  if (value === "changes-requested") return "changes_requested";
  return value;
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify authentication or share link
    const auth = await verifyAuth(req);

    const body = await req.json();
    const { versionId, updates, versionFiles, projectId } = body as any;

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: "Valid versionId required" }, { status: 400 });
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    const updatePayload = updates && typeof updates === 'object' ? updates : {};
    const hasUpdateKeys = Object.keys(updatePayload).length > 0;
    const statusOnly =
      hasUpdateKeys &&
      Object.keys(updatePayload).length === 1 &&
      Object.prototype.hasOwnProperty.call(updatePayload, 'status');
    const hasFiles = Array.isArray(versionFiles) && versionFiles.length > 0;

    const access = await resolveAccessContext(req, projectId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (statusOnly && !hasFiles) {
      // Any status change requires modify permission (owner/editor)
      if (!roleCanModify(access.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      if (!roleCanModify(access.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    let updatedVersion: any = null;
    let statusUpdate = updatePayload && updatePayload.status ? String(updatePayload.status) : null;
    statusUpdate = normalizeStatus(statusUpdate);
    if (statusUpdate && updatePayload.status !== statusUpdate) {
      updatePayload.status = statusUpdate;
    }
    const hasUpdates = hasUpdateKeys;
    if (hasUpdates) {
      const { data: currentVersion } = await supabaseAdmin
        .from("versions")
        .select("id, status")
        .eq("id", versionId)
        .single();

      const currentStatus = normalizeStatus(currentVersion?.status || null);
    if (statusUpdate) {
        if (statusUpdate === 'approved') {
          return NextResponse.json({ error: 'Use /api/versions/approve for approvals' }, { status: 409 });
        }
        const closedStatuses = ["approved", "changes_requested"];
        if (closedStatuses.includes(currentStatus)) {
          return NextResponse.json({ version: currentVersion }, { status: 200 });
        }
        const allowedFrom = ["in_review", "review_completed"];
        if (statusUpdate === "approved" || statusUpdate === "changes_requested") {
          if (!allowedFrom.includes(currentStatus)) {
            return NextResponse.json({ error: "Decision not allowed for this status" }, { status: 409 });
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from("versions")
        .update(updatePayload)
        .eq("id", versionId)
        .select()
        .single();
      if (error) throw error;
      updatedVersion = data;
      if (statusUpdate) {
        const { data: projectData } = await supabaseAdmin
          .from("projects")
          .select("owner_id")
          .eq("id", projectId)
          .single();
        const actorId = access.userId || null;
        const actorType = projectData?.owner_id && actorId && projectData.owner_id === actorId ? "owner" : "client";
        const actorName = auth?.email || actorId || "";

        if (statusUpdate === "review_completed") {
          if (isDev) console.log("[ReviewEvent] ReviewCompleted", { versionId, projectId });
          await supabaseAdmin.from("audit_logs").insert({
            actor_id: actorId,
            action: "review_completed",
            target_type: "version",
            target_id: versionId,
            meta: {
              action: "review_completed",
              version_id: versionId,
              actor_type: actorType,
              actor_name: actorName
            }
          });
        } else if (statusUpdate === "in_revision") {
          if (isDev) console.log("[ReviewEvent] RevisionStarted", { versionId, projectId });
          await supabaseAdmin.from("audit_logs").insert({
            actor_id: actorId,
            action: "revision_started",
            target_type: "version",
            target_id: versionId,
            meta: {
              action: "in_revision",
              version_id: versionId,
              actor_type: actorType,
              actor_name: actorName
            }
          });
        } else if (statusUpdate === "approved" || statusUpdate === "changes_requested") {
          await supabaseAdmin.from("audit_logs").insert({
            actor_id: actorId,
            action: "approval",
            target_type: "version",
            target_id: versionId,
            meta: {
              action: statusUpdate === "approved" ? "approved" : "changes_requested",
              version_id: versionId,
              actor_type: actorType,
              actor_name: actorName
            }
          });
        }
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("versions")
        .select()
        .eq("id", versionId)
        .single();
      if (error) throw error;
      updatedVersion = data;
    }

    // Insert new deliverable files if provided
    let filesInserted: any[] = [];
    if (Array.isArray(versionFiles) && versionFiles.length > 0) {
      const { data: insertedFiles } = await supabaseAdmin
        .from("version_files")
        .insert(
          versionFiles.map((f: any) => ({
            version_id: versionId,
            name: f.name,
            type: f.type ?? null,
            url: f.url ?? null,
            size: f.size ?? null,
          }))
        )
        .select();
      filesInserted = insertedFiles || [];
    }

    return NextResponse.json({ version: updatedVersion, files: filesInserted });
  } catch (err: any) {
    console.error("[POST /api/versions/update] Error:", err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
