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
      <head>
        {/* DNS prefetch and preconnect for external resources */}
        <link rel="dns-prefetch" href="https://waaigankcctijalvlppk.supabase.co" />
        <link rel="preconnect" href="https://waaigankcctijalvlppk.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
        {/* Preload critical external scripts */}
        <link rel="preload" href="https://unpkg.com/@supabase/supabase-js@2" as="script" />
        <link rel="preload" href="https://unpkg.com/wavesurfer.js@6" as="script" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
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
