import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanAccess } from '@/lib/shareAccess';
import { buildSimplePdf } from '@/lib/pdf';

export const runtime = 'nodejs';

function csvEscape(value: string) {
  const safe = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${safe}"`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const format = url.searchParams.get('format') || 'csv';

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ data: project }, { data: cues }, { data: entries }, { data: meta }] = await Promise.all([
      supabaseAdmin.from('projects').select('id, name').eq('id', projectId).maybeSingle(),
      supabaseAdmin.from('cues').select('id, name, display_name').eq('project_id', projectId),
      supabaseAdmin.from('cue_sheet_entries').select('*').eq('project_id', projectId),
      supabaseAdmin.from('cue_sheet_projects').select('*').eq('project_id', projectId).maybeSingle()
    ]);

    const entryByCue = (entries || []).reduce((acc, row) => {
      if (row.cue_id) acc[row.cue_id] = row;
      return acc;
    }, {} as Record<string, any>);

    const rows = (cues || []).map((cue) => {
      const entry = entryByCue[cue.id] || {};
      return {
        work_title: entry.work_title || cue.display_name || cue.name || 'Cue',
        composers: entry.composers || '',
        publishers: entry.publishers || '',
        pro: entry.pro || '',
        usage_type: entry.usage_type || '',
        start_timecode: entry.start_timecode || '',
        duration: entry.duration || '',
        notes: entry.notes || '',
        production: meta?.production || '',
        client: meta?.client || '',
        episode: meta?.episode || ''
      };
    });

    if (format === 'pdf') {
      const lines: string[] = [];
      lines.push(`Project: ${project?.name || 'Project'}`);
      if (meta?.production) lines.push(`Production: ${meta.production}`);
      if (meta?.client) lines.push(`Client: ${meta.client}`);
      if (meta?.episode) lines.push(`Episode: ${meta.episode}`);
      lines.push('');
      rows.forEach((row, idx) => {
        lines.push(`${idx + 1}. ${row.work_title}`);
        lines.push(`   Composers: ${row.composers || '-'}`);
        lines.push(`   Publishers: ${row.publishers || '-'}`);
        lines.push(`   PRO: ${row.pro || '-'}`);
        lines.push(`   Usage: ${row.usage_type || '-'}`);
        lines.push(`   Start TC: ${row.start_timecode || '-'}`);
        lines.push(`   Duration: ${row.duration || '-'}`);
        lines.push(`   Notes: ${row.notes || '-'}`);
        lines.push('');
      });

      const pdf = new Uint8Array(buildSimplePdf(lines, { title: 'Cue Sheet' }));
      return new NextResponse(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="cue_sheet_${project?.name || 'project'}.pdf"`
        }
      });
    }

    const header = [
      'Work title',
      'Composer(s)',
      'Publisher(s)',
      'PRO',
      'Usage type',
      'Start timecode',
      'Duration',
      'Notes',
      'Production',
      'Client',
      'Episode'
    ].join(',');

    const csvLines = rows.map((row) => [
      csvEscape(row.work_title),
      csvEscape(row.composers),
      csvEscape(row.publishers),
      csvEscape(row.pro),
      csvEscape(row.usage_type),
      csvEscape(row.start_timecode),
      csvEscape(row.duration),
      csvEscape(row.notes),
      csvEscape(row.production),
      csvEscape(row.client),
      csvEscape(row.episode)
    ].join(','));

    const csv = [header, ...csvLines].join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cue_sheet_${project?.name || 'project'}.csv"`
      }
    });
  } catch (err: any) {
    console.error('[CueSheetExport] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
