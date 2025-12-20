"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    supabase?: any;
    SupabaseSync?: any;
  }
}

export default function SupabaseSyncBridge() {
  useEffect(() => {
    // Expose Supabase client and sync functions to global scope
    window.supabase = supabase;

    window.SupabaseSync = {
      async saveProject(project: any) {
        try {
          const { error } = await supabase.from("projects").upsert(
            { id: project.id, name: project.name, description: project.description || null },
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
            .select(`id, name, description, created_at, updated_at, cues(id, project_id, index_in_project, original_name, name, display_name, status, max_revisions, versions(id, cue_id, index_in_cue, status, media_type, media_storage_path, media_url, media_original_name, media_display_name, media_duration, media_thumbnail_path, media_thumbnail_url, media_waveform_data))`)
            .order("created_at", { ascending: true });
          if (error) throw error;
          console.log("✅ Projects loaded:", data?.length || 0);
          return data || [];
        } catch (err) {
          console.error("❌ Error loading projects:", err);
          return [];
        }
      },

      async saveCue(projectId: string, cue: any) {
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

      async saveVersion(cueId: string, version: any) {
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

      async saveVersionFile(versionId: string, file: any) {
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

    console.log("✅ SupabaseSync bridge initialized");

    // Trigger initialization of flow.js if already loaded
    if (window.dispatchEvent) {
      window.dispatchEvent(new Event("supabase-sync-ready"));
    }
  }, []);

  return null;
}
