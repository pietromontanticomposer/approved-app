import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveAccessContext, roleCanAccess } from '@/lib/shareAccess';
import { resolveMediaUrl } from '@/lib/mediaUrlResolver';
import { createZip } from '@/lib/zip';
import { isUuid } from '@/lib/validation';

export const runtime = 'nodejs';

const sanitizeName = (value: string) =>
  String(value || 'file').replace(/[\\\/]+/g, '_').trim() || 'file';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const versionId = typeof body.versionId === 'string' ? body.versionId : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';

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
      .select('id, index_in_cue, cues(id, name, display_name, project_id, projects(id, name))')
      .eq('id', versionId)
      .maybeSingle();

    const cue = (version as any)?.cues || null;
    const project = cue?.projects || null;
    if (!cue?.project_id || cue.project_id !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: filesRaw } = await supabaseAdmin
      .from('version_files')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: true });

    const files = filesRaw || [];
    if (!files.length) {
      return NextResponse.json({ error: 'No final delivery files' }, { status: 404 });
    }

    const zipEntries: { name: string; data: Buffer | string }[] = [];
    for (const file of files) {
      const baseName = sanitizeName(file.name || 'file');
      const rawUrl = typeof file.url === 'string' ? file.url : null;
      if (!rawUrl) {
        zipEntries.push({ name: `${baseName}.link.txt`, data: 'File URL missing' });
        continue;
      }
      const resolved = await resolveMediaUrl(rawUrl);
      if (!resolved) {
        zipEntries.push({ name: `${baseName}.link.txt`, data: 'File URL missing' });
        continue;
      }
      try {
        const resp = await fetch(resolved);
        if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`);
        const buf = Buffer.from(await resp.arrayBuffer());
        zipEntries.push({ name: baseName, data: buf });
      } catch (err) {
        zipEntries.push({ name: `${baseName}.link.txt`, data: resolved });
      }
    }

    const zip = new Uint8Array(createZip(zipEntries));
    const projectName = sanitizeName(project?.name || 'project');
    const cueName = sanitizeName(cue?.display_name || cue?.name || 'cue');
    const versionLabel = `v${(version as any)?.index_in_cue != null ? Number((version as any).index_in_cue) + 1 : ''}`;
    const filename = `final_delivery_${projectName}_${cueName}_${versionLabel}.zip`;

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('[FinalDelivery] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
