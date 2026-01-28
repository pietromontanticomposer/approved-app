import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanAccess } from '@/lib/shareAccess';
import { buildSimplePdf } from '@/lib/pdf';
import { DELIVERY_TEMPLATES } from '@/lib/deliveryTemplates';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const versionId = typeof body.versionId === 'string' ? body.versionId : '';

    if (!projectId || !isUuid(projectId) || !versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid projectId and versionId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: version } = await supabaseAdmin
      .from('versions')
      .select('id, index_in_cue, cue_id, cues(id, name, display_name, projects(id, name))')
      .eq('id', versionId)
      .single();

    const cue = (version as any)?.cues || null;
    const project = cue?.projects || null;

    const { data: delivery } = await supabaseAdmin
      .from('version_deliveries')
      .select('*')
      .eq('version_id', versionId)
      .maybeSingle();

    const templateKey = (delivery?.template_key || 'adv') as keyof typeof DELIVERY_TEMPLATES;
    const template = DELIVERY_TEMPLATES[templateKey] || DELIVERY_TEMPLATES.adv;

    const checklist = Array.isArray(delivery?.checklist) ? delivery.checklist : template.checklist.map(item => ({ label: item, done: false }));
    const naming = Array.isArray(delivery?.naming) ? delivery.naming : template.naming;

    const lines: string[] = [];
    lines.push(`Project: ${project?.name || 'Project'}`);
    lines.push(`Cue: ${cue?.display_name || cue?.name || 'Cue'}`);
    lines.push(`Version: v${(version as any)?.index_in_cue != null ? Number((version as any).index_in_cue) + 1 : ''}`);
    lines.push(`Template: ${template.name}`);
    lines.push('');
    lines.push('Checklist:');
    checklist.forEach((item: any) => {
      const label = typeof item === 'string' ? item : item.label || '';
      const done = typeof item === 'string' ? false : !!item.done;
      lines.push(`${done ? '[x]' : '[ ]'} ${label}`);
    });
    lines.push('');
    lines.push('Naming suggestions:');
    (naming || []).forEach((name: any) => {
      lines.push(`- ${String(name)}`);
    });

    const pdf = buildSimplePdf(lines, { title: 'Delivery Manifest' });

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="delivery_manifest_${project?.name || 'project'}.pdf"`
      }
    });
  } catch (err: any) {
    console.error('[DeliveryManifest] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
