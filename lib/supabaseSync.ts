import { supabase } from "./supabaseClient";

const isDev = process.env.NODE_ENV !== "production";

// ============================================
// PROJECT OPERATIONS
// ============================================

export async function saveProject(project: any) {
  try {
    const { error } = await supabase.from("projects").upsert(
      {
        id: project.id,
        name: project.name,
        description: project.description || null,
      },
      { onConflict: "id" }
    );

    if (error) throw error;
    if (isDev) console.log("✅ Project saved:", project.id);
    return true;
  } catch (err) {
    console.error("❌ Error saving project:", err);
    return false;
  }
}

export async function loadProjects() {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        description,
        created_at,
        updated_at,
        cues(
          id,
          project_id,
          index_in_project,
          original_name,
          name,
          display_name,
          status,
          versions(
            id,
            cue_id,
            index_in_cue,
            status,
            media_type,
            media_storage_path,
            media_url,
            media_original_name,
            media_display_name,
            media_duration,
            media_thumbnail_path,
            media_thumbnail_url
          )
        ),
        references_root(
          id,
          name,
          active_version_index,
          reference_versions(
            id,
            name,
            type,
            url,
            size,
            duration,
            thumbnail_path,
            thumbnail_url
          )
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (isDev) console.log("✅ Projects loaded:", data?.length || 0);
    return data || [];
  } catch (err) {
    console.error("❌ Error loading projects:", err);
    return [];
  }
}

export async function deleteProject(projectId: string) {
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;
    if (isDev) console.log("✅ Project deleted:", projectId);
    return true;
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    return false;
  }
}

// ============================================
// CUE OPERATIONS
// ============================================

export async function saveCue(projectId: string, cue: any) {
  try {
    const { error } = await supabase.from("cues").upsert(
      {
        id: cue.id,
        project_id: projectId,
        index_in_project: cue.index || cue.indexInProject || 0,
        original_name: cue.originalName || null,
        name: cue.name || null,
        display_name: cue.displayName || null,
        status: cue.status || "in-review",
      },
      { onConflict: "id" }
    );

    if (error) throw error;
    if (isDev) console.log("✅ Cue saved:", cue.id);
    return true;
  } catch (err) {
    console.error("❌ Error saving cue:", err);
    return false;
  }
}

export async function deleteCue(cueId: string) {
  try {
    const { error } = await supabase.from("cues").delete().eq("id", cueId);

    if (error) throw error;
    if (isDev) console.log("✅ Cue deleted:", cueId);
    return true;
  } catch (err) {
    console.error("❌ Error deleting cue:", err);
    return false;
  }
}

// ============================================
// VERSION OPERATIONS
// ============================================

export async function saveVersion(cueId: string, version: any) {
  try {
    const { error } = await supabase.from("versions").upsert(
      {
        id: version.id,
        cue_id: cueId,
        index_in_cue: version.index || version.indexInCue || 0,
        status: version.status || "in-review",
        media_type: version.media?.type || null,
        media_storage_path: version.media?.storagePath || null,
        media_url: version.media?.url || null,
        media_original_name: version.media?.originalName || null,
        media_display_name: version.media?.displayName || null,
        media_duration: version.media?.duration || null,
        media_thumbnail_path: version.media?.thumbnailPath || null,
        media_thumbnail_url: version.media?.thumbnailUrl || null,
      },
      { onConflict: "id" }
    );

    if (error) throw error;
    if (isDev) console.log("✅ Version saved:", version.id);
    return true;
  } catch (err) {
    console.error("❌ Error saving version:", err);
    return false;
  }
}

export async function deleteVersion(versionId: string) {
  try {
    const { error } = await supabase
      .from("versions")
      .delete()
      .eq("id", versionId);

    if (error) throw error;
    if (isDev) console.log("✅ Version deleted:", versionId);
    return true;
  } catch (err) {
    console.error("❌ Error deleting version:", err);
    return false;
  }
}

// ============================================
// VERSION FILE OPERATIONS (Deliverables)
// ============================================

export async function saveVersionFile(versionId: string, file: any) {
  try {
    const { error } = await supabase.from("version_files").upsert(
      {
        id: file.id,
        version_id: versionId,
        name: file.name,
        type: file.type || null,
        url: file.url || null,
        size: file.size || null,
      },
      { onConflict: "id" }
    );

    if (error) throw error;
    if (isDev) console.log("✅ Version file saved:", file.id);
    return true;
  } catch (err) {
    console.error("❌ Error saving version file:", err);
    return false;
  }
}

export async function deleteVersionFile(fileId: string) {
  try {
    const { error } = await supabase
      .from("version_files")
      .delete()
      .eq("id", fileId);

    if (error) throw error;
    if (isDev) console.log("✅ Version file deleted:", fileId);
    return true;
  } catch (err) {
    console.error("❌ Error deleting version file:", err);
    return false;
  }
}

// ============================================
// COMMENT OPERATIONS
// ============================================

export async function saveComment(versionId: string, comment: any) {
  try {
    const { error } = await supabase.from("comments").upsert(
      {
        id: comment.id,
        version_id: versionId,
        time_seconds: comment.timeSeconds || 0,
        author: comment.author || null,
        text: comment.text,
      },
      { onConflict: "id" }
    );

    if (error) throw error;
    if (isDev) console.log("✅ Comment saved:", comment.id);
    return true;
  } catch (err) {
    console.error("❌ Error saving comment:", err);
    return false;
  }
}

export async function deleteComment(commentId: string) {
  try {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;
    if (isDev) console.log("✅ Comment deleted:", commentId);
    return true;
  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    return false;
  }
}
