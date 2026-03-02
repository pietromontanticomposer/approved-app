import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendApprovalStatusEmail } from '@/lib/email';

/**
 * GET /api/admin/approve-user?token=xxx&action=approve|reject
 *
 * Called when admin clicks the approve/reject link in the email.
 * Updates the user_approvals record and notifies the user.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');
    const action = searchParams.get('action');
    const reason = searchParams.get('reason') || '';

    if (!token || !action) {
      return new NextResponse(renderHtml('error', 'Parametri mancanti', 'Token o azione non specificati.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (action !== 'approve' && action !== 'reject') {
      return new NextResponse(renderHtml('error', 'Azione non valida', 'L\'azione deve essere "approve" o "reject".'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Find the approval record
    const { data: approvalRecord, error: findErr } = await supabaseAdmin
      .from('user_approvals')
      .select('*')
      .eq('approval_token', token)
      .maybeSingle();

    if (findErr || !approvalRecord) {
      return new NextResponse(renderHtml('error', 'Token non valido', 'Il link di approvazione non è valido o è già stato utilizzato.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (approvalRecord.status !== 'pending') {
      const statusText = approvalRecord.status === 'approved' ? 'già approvato' : 'già rifiutato';
      return new NextResponse(renderHtml('info', 'Già processato', `Questo utente è stato ${statusText}.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Check token age — links expire after 30 days
    if (approvalRecord.created_at) {
      const created = new Date(approvalRecord.created_at).getTime();
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - created > maxAgeMs) {
        return new NextResponse(renderHtml('error', 'Link scaduto', 'Il link di approvazione è scaduto (30 giorni). Genera un nuovo link.'), {
          status: 410,
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    // Update the approval status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateErr } = await supabaseAdmin
      .from('user_approvals')
      .update({
        status: newStatus,
        decided_at: new Date().toISOString(),
        decided_by: 'admin_email_link',
        rejection_reason: action === 'reject' ? (reason || null) : null,
        approval_token: null, // Invalidate the token after use
      })
      .eq('id', approvalRecord.id);

    if (updateErr) {
      console.error('[approve-user] Update error', updateErr);
      return new NextResponse(renderHtml('error', 'Errore', 'Impossibile aggiornare lo stato. Riprova.'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Send email to user
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://approved-app-eight.vercel.app';
    const loginLink = `${baseUrl}/login`;

    try {
      await sendApprovalStatusEmail(
        approvalRecord.email,
        action === 'approve',
        loginLink,
        action === 'reject' ? reason : undefined
      );
    } catch (emailErr) {
      console.warn('[approve-user] Could not send status email to user', emailErr);
      // Don't fail if email fails
    }

    // Show success page
    if (action === 'approve') {
      return new NextResponse(renderHtml('success', 'Utente Approvato', `L'utente <strong>${approvalRecord.email}</strong> è stato approvato e può ora accedere all'app.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return new NextResponse(renderHtml('rejected', 'Utente Rifiutato', `L'utente <strong>${approvalRecord.email}</strong> è stato rifiutato e non potrà accedere all'app.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

  } catch (err: any) {
    console.error('[approve-user] Error', err);
    return new NextResponse(renderHtml('error', 'Errore', err?.message || 'Errore imprevisto'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function renderHtml(type: 'success' | 'error' | 'info' | 'rejected', title: string, message: string): string {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    success: { bg: '#f0fdf4', border: '#16a34a', text: '#14532d' },
    error: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a5f' },
    rejected: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
  };

  const c = colors[type] || colors.info;

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Approved</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      background: #020617;
      color: #e5e7eb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 48px;
      max-width: 500px;
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #f8fafc;
    }
    .message {
      background: ${c.bg};
      border-left: 4px solid ${c.border};
      padding: 16px;
      border-radius: 8px;
      color: ${c.text};
      font-size: 15px;
      margin-bottom: 24px;
    }
    .back-link {
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
    }
    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${type === 'success' ? '✅' : type === 'rejected' ? '❌' : type === 'error' ? '⚠️' : 'ℹ️'}</div>
    <h1>${title}</h1>
    <div class="message">${message}</div>
    <a href="/" class="back-link">Torna alla home</a>
  </div>
</body>
</html>
  `;
}
