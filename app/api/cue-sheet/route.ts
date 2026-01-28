import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanAccess, roleCanModify } from '@/lib/shareAccess';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ data: projectMeta }, { data: entries }] = await Promise.all([
      supabaseAdmin
        .from('cue_sheet_projects')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
      supabaseAdmin
        .from('cue_sheet_entries')
        .select('*')
        .eq('project_id', projectId)
    ]);

    return NextResponse.json({ project: projectMeta || null, entries: entries || [] }, { status: 200 });
  } catch (err: any) {
    console.error('[CueSheet] GET error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const cueId = typeof body.cueId === 'string' ? body.cueId : '';
    const projectMeta = body.projectMeta && typeof body.projectMeta === 'object' ? body.projectMeta : null;
    const entry = body.entry && typeof body.entry === 'object' ? body.entry : null;

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanModify(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let savedProject = null;
    let savedEntry = null;

    if (projectMeta) {
      const payload = {
        project_id: projectId,
        production: projectMeta.production || null,
        client: projectMeta.client || null,
        episode: projectMeta.episode || null,
        notes: projectMeta.notes || null
      };
      const { data, error } = await supabaseAdmin
        .from('cue_sheet_projects')
        .upsert(payload, { onConflict: 'project_id' })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      savedProject = data;
    }

    if (cueId && entry) {
      const payload = {
        cue_id: cueId,
        project_id: projectId,
        work_title: entry.work_title || null,
        composers: entry.composers || null,
        publishers: entry.publishers || null,
        pro: entry.pro || null,
        usage_type: entry.usage_type || null,
        start_timecode: entry.start_timecode || null,
        duration: entry.duration || null,
        notes: entry.notes || null
      };

      const { data, error } = await supabaseAdmin
        .from('cue_sheet_entries')
        .upsert(payload, { onConflict: 'cue_id' })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      savedEntry = data;
    }

    return NextResponse.json({ project: savedProject, entry: savedEntry }, { status: 200 });
  } catch (err: any) {
    console.error('[CueSheet] POST error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
