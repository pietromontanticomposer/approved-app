// Bridge between vanilla JS (flow.js) and TypeScript modules (supabaseSync)
// This allows flow.js to call Supabase sync functions

// Import sync functions
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

// Expose globally
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

export default window.SupabaseSync;
