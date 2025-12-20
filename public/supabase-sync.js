// Client-side Supabase sync - works in browser
// This file is loaded directly by flow.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export sync functions
export const SupabaseSync = {
  async saveProject(project) {
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
      console.log("✅ Project saved:", project.id);
      return true;
    } catch (err) {
      console.error("❌ Error saving project:", err);
      return false;
    }
  },

  async loadProjects() {
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
          )
        `
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      console.log("✅ Projects loaded:", data?.length || 0);
      return data || [];
    } catch (err) {
      console.error("❌ Error loading projects:", err);
      return [];
    }
  },

  async saveCue(projectId, cue) {
    try {
      const { error } = await supabase.from("cues").upsert(
        {
          id: cue.id,
          project_id: projectId,
          index_in_project: cue.index || cue.indexInProject || 0,
          original_name: cue.originalName || null,
          name: cue.name || null,
          display_name: cue.displayName || null,
          status: cue.status || "in_review",
          max_revisions: typeof cue.maxRevisions === "number" ? cue.maxRevisions : null,
        },
        { onConflict: "id" }
      );
      if (error) throw error;
      console.log("✅ Cue saved:", cue.id);
      return true;
    } catch (err) {
      console.error("❌ Error saving cue:", err);
      return false;
    }
  },

  async saveVersion(cueId, version) {
    try {
      const { error } = await supabase.from("versions").upsert(
        {
          id: version.id,
          cue_id: cueId,
          index_in_cue: version.index || version.indexInCue || 0,
          status: version.status || "in_review",
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
      console.log("✅ Version saved:", version.id);
      return true;
    } catch (err) {
      console.error("❌ Error saving version:", err);
      return false;
    }
  },

  async saveVersionFile(versionId, file) {
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
      console.log("✅ Version file saved:", file.id);
      return true;
    } catch (err) {
      console.error("❌ Error saving version file:", err);
      return false;
    }
  },
};

// Expose globally for flow.js
if (typeof window !== "undefined") {
  window.SupabaseSync = SupabaseSync;
  console.log("✅ SupabaseSync initialized");
}
