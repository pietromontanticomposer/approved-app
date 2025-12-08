// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

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
      <body>
        {children}
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
