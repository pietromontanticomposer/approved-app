import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanAccess, roleCanModify } from '@/lib/shareAccess';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const versionId = url.searchParams.get('versionId') || '';

    if (!projectId || !isUuid(projectId) || !versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid projectId and versionId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: delivery } = await supabaseAdmin
      .from('version_deliveries')
      .select('*')
      .eq('version_id', versionId)
      .maybeSingle();

    return NextResponse.json({ delivery: delivery || null }, { status: 200 });
  } catch (err: any) {
    console.error('[Delivery] GET error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const cueId = typeof body.cueId === 'string' ? body.cueId : '';
    const versionId = typeof body.versionId === 'string' ? body.versionId : '';
    const templateKey = typeof body.template_key === 'string' ? body.template_key : '';
    const checklist = Array.isArray(body.checklist) ? body.checklist : [];
    const naming = Array.isArray(body.naming) ? body.naming : null;

    if (!projectId || !isUuid(projectId) || !cueId || !isUuid(cueId) || !versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid projectId, cueId, versionId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanModify(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = {
      version_id: versionId,
      project_id: projectId,
      cue_id: cueId,
      template_key: templateKey || 'adv',
      checklist: checklist,
      naming: naming,
      updated_by: access.userId || null
    };

    const { data, error } = await supabaseAdmin
      .from('version_deliveries')
      .upsert(payload, { onConflict: 'version_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ delivery: data }, { status: 200 });
  } catch (err: any) {
    console.error('[Delivery] POST error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
