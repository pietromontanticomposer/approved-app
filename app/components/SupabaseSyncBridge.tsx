"use client";

import { useEffect } from "react";
import {
  saveProject,
  loadProjects,
  deleteProject,
  saveCue,
  deleteCue,
  saveVersion,
  deleteVersion,
  saveVersionFile,
  deleteVersionFile,
  saveComment,
  deleteComment,
} from "@/lib/supabaseSync";

export default function SupabaseSyncBridge() {
  useEffect(() => {
    // Expose sync functions to global scope for vanilla JS
    window.SupabaseSync = {
      saveProject,
      loadProjects,
      deleteProject,
      saveCue,
      deleteCue,
      saveVersion,
      deleteVersion,
      saveVersionFile,
      deleteVersionFile,
      saveComment,
      deleteComment,
    };

    console.log("✅ SupabaseSync bridge initialized");

    // Trigger initialization of flow.js if already loaded
    if (window.dispatchEvent) {
      window.dispatchEvent(new Event("supabase-sync-ready"));
    }
  }, []);

  // This component doesn't render anything
  return null;
}
