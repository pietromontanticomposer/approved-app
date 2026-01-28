import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext } from '@/lib/shareAccess';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const shareId = typeof body.shareId === 'string' ? body.shareId : null;

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: access.userId || null,
      action: 'onboarding_completed',
      target_type: 'project',
      target_id: projectId,
      meta: {
        share_id: shareId || access.shareId || null,
        role: access.role,
        source: access.source
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Onboarding] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
