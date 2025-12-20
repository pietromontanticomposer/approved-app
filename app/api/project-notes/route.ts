import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAuth } from '@/lib/auth';

// GET /api/project-notes?projectId=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId parameter' }, { status: 400 });
    }

    // Verify user has access to project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id, team_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check access
    let hasAccess = project.owner_id === auth.userId;

    if (!hasAccess) {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('member_id', auth.userId)
        .maybeSingle();
      if (membership) hasAccess = true;
    }

    if (!hasAccess && project.team_id) {
      const { data: teamMember } = await supabaseAdmin
        .from('team_members')
        .select('user_id')
        .eq('team_id', project.team_id)
        .eq('user_id', auth.userId)
        .maybeSingle();
      if (teamMember) hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch notes (pinned first, then by creation date)
    const { data: notes, error } = await supabaseAdmin
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/project-notes] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] }, { status: 200 });
  } catch (err: any) {
    console.error('[GET /api/project-notes] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/project-notes
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, text, pinned, color } = body;

    if (!projectId || !text) {
      return NextResponse.json({ error: 'Missing required fields: projectId, text' }, { status: 400 });
    }

    // Verify user has access to project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id, team_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check access (same logic as GET)
    let hasAccess = project.owner_id === auth.userId;

    if (!hasAccess) {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('member_id', auth.userId)
        .maybeSingle();
      if (membership) hasAccess = true;
    }

    if (!hasAccess && project.team_id) {
      const { data: teamMember } = await supabaseAdmin
        .from('team_members')
        .select('user_id')
        .eq('team_id', project.team_id)
        .eq('user_id', auth.userId)
        .maybeSingle();
      if (teamMember) hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user name
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
    const authorName = userData?.user?.user_metadata?.full_name ||
                      userData?.user?.email?.split('@')[0] ||
                      'Unknown User';

    // Create note
    const { data: note, error } = await supabaseAdmin
      .from('project_notes')
      .insert({
        project_id: projectId,
        text: text.trim(),
        author_id: auth.userId,
        author_name: authorName,
        pinned: pinned || false,
        color: color || 'default'
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/project-notes] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/project-notes] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/project-notes (update note)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { noteId, text, pinned, color } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'Missing noteId' }, { status: 400 });
    }

    // Verify note exists and user is the author
    const { data: existingNote } = await supabaseAdmin
      .from('project_notes')
      .select('*')
      .eq('id', noteId)
      .maybeSingle();

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (existingNote.author_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own notes' }, { status: 403 });
    }

    // Update note
    const updateData: any = {};
    if (text !== undefined) updateData.text = text.trim();
    if (pinned !== undefined) updateData.pinned = pinned;
    if (color !== undefined) updateData.color = color;

    const { data: note, error } = await supabaseAdmin
      .from('project_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/project-notes] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (err: any) {
    console.error('[PATCH /api/project-notes] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/project-notes?noteId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const noteId = url.searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ error: 'Missing noteId parameter' }, { status: 400 });
    }

    // Verify note exists
    const { data: existingNote } = await supabaseAdmin
      .from('project_notes')
      .select('*, projects!inner(owner_id)')
      .eq('id', noteId)
      .maybeSingle();

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is author or project owner
    const isAuthor = existingNote.author_id === auth.userId;
    const isProjectOwner = (existingNote as any).projects?.owner_id === auth.userId;

    if (!isAuthor && !isProjectOwner) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own notes or be project owner' }, { status: 403 });
    }

    // Delete note
    const { error } = await supabaseAdmin
      .from('project_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('[DELETE /api/project-notes] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[DELETE /api/project-notes] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
