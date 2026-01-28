import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanAccess } from '@/lib/shareAccess';
import { resolveMediaUrl } from '@/lib/mediaUrlResolver';
import { formatTimecode, parseTimecodeToSeconds, secondsWithOffset } from '@/lib/timecode';

export const runtime = 'nodejs';

const isDev = process.env.NODE_ENV !== 'production';

type ExportFormat = 'universal_csv' | 'reaper_tsv' | 'audition_tsv' | 'protools_csv' | 'logic_csv';

function csvEscape(value: string) {
  const safe = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${safe}"`;
}

function tsvEscape(value: string) {
  return value.replace(/\r?\n/g, ' ').replace(/\t/g, ' ');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const versionId = typeof body.versionId === 'string' ? body.versionId : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const format = (body.format || 'universal_csv') as ExportFormat;
    const fps = Number(body.fps || 25);
    const startTc = typeof body.start_timecode === 'string' ? body.start_timecode : '00:00:00.000';
    const includeVoice = body.include_voice === true;

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid versionId required' }, { status: 400 });
    }
    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: version } = await supabaseAdmin
      .from('versions')
      .select('id, cue_id, cues(project_id)')
      .eq('id', versionId)
      .single();

    const resolvedProjectId = (version as any)?.cues?.project_id || null;
    if (!resolvedProjectId || resolvedProjectId !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: comments } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('version_id', versionId)
      .order('time_seconds', { ascending: true });

    const offsetSeconds = parseTimecodeToSeconds(startTc, fps);

    const rows = await Promise.all(
      (comments || []).map(async (c: any) => {
        const baseSeconds = typeof c.time_seconds === 'number' ? c.time_seconds : 0;
        const timeSeconds = secondsWithOffset(baseSeconds, offsetSeconds);
        const timecode = formatTimecode(timeSeconds, fps);
        let voiceUrl: string | null = null;
        if (includeVoice && c.audio_url) {
          voiceUrl = await resolveMediaUrl(c.audio_url);
        }
        return {
          time_seconds: timeSeconds,
          timecode,
          author: c.author || 'Client',
          text: c.text || '',
          comment_id: c.id,
          voice_url: voiceUrl || ''
        };
      })
    );

    let content = '';
    let filename = 'markers.csv';
    let contentType = 'text/csv; charset=utf-8';

    if (format === 'reaper_tsv') {
      filename = 'reaper_markers.txt';
      contentType = 'text/plain; charset=utf-8';
      const header = ['#', 'Name', 'Position'].join('\t');
      const lines = rows.map((r, idx) => {
        const label = `${r.author}: ${r.text}`.trim();
        return [String(idx + 1), tsvEscape(label), r.timecode].join('\t');
      });
      content = [header, ...lines].join('\n');
    } else if (format === 'audition_tsv') {
      filename = 'audition_markers.txt';
      contentType = 'text/tab-separated-values; charset=utf-8';
      const header = ['Name', 'Start', 'Duration', 'Description'].join('\t');
      const lines = rows.map((r) => {
        const label = `${r.author}: ${r.text}`.trim();
        return [
          tsvEscape(label || 'Marker'),
          r.timecode,
          '0',
          tsvEscape(r.comment_id)
        ].join('\t');
      });
      content = [header, ...lines].join('\n');
    } else {
      filename = 'markers.csv';
      const header = ['time_seconds', 'timecode_hh:mm:ss.ms', 'author', 'text', 'comment_id', 'voice_url'].join(',');
      const lines = rows.map((r) => [
        String(r.time_seconds.toFixed(3)),
        csvEscape(r.timecode),
        csvEscape(r.author),
        csvEscape(r.text),
        csvEscape(r.comment_id),
        csvEscape(includeVoice ? r.voice_url : '')
      ].join(','));
      content = [header, ...lines].join('\n');
    }

    if (isDev) console.log('[MarkersExport] Exported', rows.length, 'comments');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('[MarkersExport] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
