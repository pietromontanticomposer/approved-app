// app/api/versions/update/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canModifyProject } from '@/lib/auth';

export const runtime = "nodejs";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { versionId, updates, versionFiles, projectId } = body as any;

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: "Valid versionId required" }, { status: 400 });
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    // Verify project modify permission
    const canModify = await canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let updatedVersion: any = null;
    const statusUpdate = updates && updates.status ? String(updates.status) : null;
    const hasUpdates = updates && Object.keys(updates || {}).length > 0;
    if (hasUpdates) {
      const { data: currentVersion } = await supabaseAdmin
        .from("versions")
        .select("id, status")
        .eq("id", versionId)
        .single();

      const currentStatus = currentVersion?.status || null;
      if (statusUpdate) {
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
        .update(updates)
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
        const actorType = projectData?.owner_id && projectData.owner_id === auth.userId ? "owner" : "client";
        const actorName = auth.email || "";

        if (statusUpdate === "review_completed") {
          console.log("[ReviewEvent] ReviewCompleted", { versionId, projectId });
          await supabaseAdmin.from("audit_logs").insert({
            actor_id: auth.userId || null,
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
          console.log("[ReviewEvent] RevisionStarted", { versionId, projectId });
          await supabaseAdmin.from("audit_logs").insert({
            actor_id: auth.userId || null,
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
            actor_id: auth.userId || null,
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
