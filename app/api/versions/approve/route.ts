import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUuid } from '@/lib/validation';
import { resolveAccessContext, roleCanModify } from '@/lib/shareAccess';
import { resolveMediaUrl } from '@/lib/mediaUrlResolver';
import { sha256FromUrl } from '@/lib/hash';

export const runtime = 'nodejs';

const isDev = process.env.NODE_ENV !== 'production';

function normalizeStatus(value: string | null) {
  if (!value) return '';
  if (value === 'in-review') return 'in_review';
  if (value === 'changes-requested') return 'changes_requested';
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const versionId = typeof body.versionId === 'string' ? body.versionId : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const approvalNote = typeof body.approval_note === 'string' ? body.approval_note.trim() : null;
    const changelog = typeof body.changelog === 'string' ? body.changelog.trim() : null;

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: 'Valid versionId required' }, { status: 400 });
    }
    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanModify(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: version } = await supabaseAdmin
      .from('versions')
      .select('id, status, cue_id, media_storage_path, media_url, media_original_name, media_display_name, cues(project_id)')
      .eq('id', versionId)
      .single();

    const resolvedProjectId = (version as any)?.cues?.project_id || null;
    if (!resolvedProjectId || resolvedProjectId !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentStatus = normalizeStatus(String((version as any)?.status || 'in_review'));
    if (currentStatus === 'approved') {
      const { data: existingApproval } = await supabaseAdmin
        .from('version_approvals')
        .select('*')
        .eq('version_id', versionId)
        .maybeSingle();
      return NextResponse.json({ approval: existingApproval || null, version }, { status: 200 });
    }

    if (currentStatus === 'changes_requested') {
      return NextResponse.json({ error: 'Decision already recorded for this version' }, { status: 409 });
    }

    let mediaHash: string | null = null;
    try {
      const mediaPath = (version as any)?.media_storage_path || (version as any)?.media_url || null;
      if (mediaPath) {
        const mediaUrl = await resolveMediaUrl(mediaPath);
        if (mediaUrl) {
          mediaHash = await sha256FromUrl(mediaUrl);
        }
      }
    } catch (err) {
      console.warn('[Approve] Failed to compute media hash', err);
    }

    const existing = await supabaseAdmin
      .from('version_approvals')
      .select('*')
      .eq('version_id', versionId)
      .maybeSingle();

    let approvalRecord = existing.data || null;

    if (!approvalRecord) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('version_approvals')
        .insert({
          version_id: versionId,
          project_id: projectId,
          approved_by: access.userId || null,
          approved_at: new Date().toISOString(),
          approval_note: approvalNote,
          changelog: changelog,
          media_hash: mediaHash,
          media_hash_alg: mediaHash ? 'sha256' : 'sha256'
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      approvalRecord = inserted;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('versions')
      .update({ status: 'approved' })
      .eq('id', versionId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: access.userId || null,
      action: 'approval',
      target_type: 'version',
      target_id: versionId,
      meta: {
        action: 'approved',
        version_id: versionId,
        actor_type: access.source === 'user' ? 'owner' : 'client',
        actor_name: access.userId || null
      }
    });

    if (isDev) console.log('[Approve] Version approved', versionId);

    return NextResponse.json({ approval: approvalRecord, version: updated }, { status: 200 });
  } catch (err: any) {
    console.error('[Approve] Error', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
