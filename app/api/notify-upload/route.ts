// app/api/notify-upload/route.ts
/**
 * Notification API for upload events
 * Sends email notifications to collaborators when files are uploaded
 */

import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';
import { sendNewVersionNotification, UploadType } from '@/lib/email';
import { isUuid } from '@/lib/validation';

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, fileName, uploadType, cueName } = body;

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    // Get project details
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get uploader name
    const { data: uploaderAuth } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
    const uploaderName = uploaderAuth?.user?.user_metadata?.name || uploaderAuth?.user?.email || 'Un membro del team';

    // Get collaborators (exclude uploader)
    const { data: members } = await supabaseAdmin
      .from('project_members')
      .select('member_id')
      .eq('project_id', projectId)
      .neq('member_id', auth.userId);

    if (!members || members.length === 0) {
      return NextResponse.json({ success: true, message: 'No collaborators to notify' });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://approved-app-eight.vercel.app';
    const projectLink = `${appUrl}/?project=${projectId}`;

    // Send emails
    const emailPromises = members.map(async (member: any) => {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.member_id);
      if (!authUser?.user?.email) return;

      try {
        await sendNewVersionNotification(
          authUser.user.email,
          project.name || 'Progetto',
          fileName || 'File',
          uploaderName,
          projectLink,
          (uploadType as UploadType) || 'unknown',
          cueName
        );
      } catch (err) {
        console.error('[Notify] Failed to send email:', err);
      }
    });

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ success: true, notified: members.length });
  } catch (err: any) {
    console.error('[POST /api/notify-upload] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
