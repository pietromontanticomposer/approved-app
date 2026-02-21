import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/auth/check-approval
 *
 * Checks if the current user is approved to use the app.
 * Requires Authorization header with Bearer token.
 *
 * Returns: { approved: boolean, status: 'pending' | 'approved' | 'rejected' | 'no_record' }
 */
export async function GET(req: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Get user from token
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

    // Check approval status
    const { data: approvalRecord, error: approvalErr } = await supabaseAdmin
      .from('user_approvals')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (approvalErr) {
      console.error('[check-approval] Error fetching approval', approvalErr);
      return NextResponse.json({ error: 'Error checking approval' }, { status: 500 });
    }

    // If no approval record exists, user doesn't need approval (legacy user or approval disabled)
    if (!approvalRecord) {
      return NextResponse.json({
        approved: true,
        status: 'no_record',
        message: 'User predates approval system'
      });
    }

    return NextResponse.json({
      approved: approvalRecord.status === 'approved',
      status: approvalRecord.status,
    });

  } catch (err: any) {
    console.error('[check-approval] Error', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
