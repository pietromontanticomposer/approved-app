// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SupabaseSyncBridge from "./components/SupabaseSyncBridge";

export const metadata: Metadata = {
  title: "Approved",
  description: "Approved – project review workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <a href="/login" style={{position: 'fixed', right: 12, top: 12, zIndex: 1000, background: '#0f172a', color: '#fff', padding: '6px 8px', borderRadius: 6, textDecoration: 'none', fontSize: 13}}>Login</a>
        {children}
        <SupabaseSyncBridge />
        {/* Initialize Supabase sync bridge */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Placeholder for SupabaseSync - will be populated by client-side code
              if (!window.SupabaseSync) {
                window.SupabaseSync = {
                  saveProject: async () => { console.warn('SupabaseSync not initialized'); },
                  loadProjects: async () => { console.warn('SupabaseSync not initialized'); return []; },
                  deleteProject: async () => { console.warn('SupabaseSync not initialized'); },
                  saveCue: async () => { console.warn('SupabaseSync not initialized'); },
                  deleteCue: async () => { console.warn('SupabaseSync not initialized'); },
                  saveVersion: async () => { console.warn('SupabaseSync not initialized'); },
                  deleteVersion: async () => { console.warn('SupabaseSync not initialized'); },
                  saveVersionFile: async () => { console.warn('SupabaseSync not initialized'); },
                  deleteVersionFile: async () => { console.warn('SupabaseSync not initialized'); },
                  saveComment: async () => { console.warn('SupabaseSync not initialized'); },
                  deleteComment: async () => { console.warn('SupabaseSync not initialized'); }
                };
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
