import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV !== "production";

function readEnv(name: string, fallback = ''): string {
  const value = process.env[name];
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function readEnvInt(name: string, fallback: number): number {
  const raw = readEnv(name);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readEnvBool(name: string, fallback: boolean): boolean {
  const raw = readEnv(name).toLowerCase();
  if (!raw) return fallback;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return fallback;
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
let transporter: any = null;

function getTransporter() {
  // Read env vars at runtime, not at module load time
  const SMTP_HOST = readEnv('SMTP_HOST');
  const SMTP_PORT = readEnvInt('SMTP_PORT', 587);
  const SMTP_SECURE = readEnvBool('SMTP_SECURE', SMTP_PORT === 465);
  const SMTP_USER = readEnv('SMTP_USER');
  const SMTP_PASS = readEnv('SMTP_PASS');

  if (!SMTP_HOST && !SMTP_USER && !SMTP_PASS) {
    console.warn('[Email] SMTP not configured - SMTP_HOST:', !!SMTP_HOST, 'SMTP_USER:', !!SMTP_USER, 'SMTP_PASS:', !!SMTP_PASS);
    return null;
  }

  // Recreate transporter each time to ensure fresh env vars
  const transportConfig: any = SMTP_HOST
    ? {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
      }
    : {
        service: 'gmail',
      };

  if (SMTP_USER || SMTP_PASS) {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Email] Incomplete SMTP auth configuration - SMTP_USER:', !!SMTP_USER, 'SMTP_PASS:', !!SMTP_PASS);
      return null;
    }
    transportConfig.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }

  transporter = nodemailer.createTransport(transportConfig);

  return transporter;
}

function getFromAddress() {
  const FROM_NAME = readEnv('FROM_NAME') || 'Approved';
  const FROM_ADDRESS = readEnv('FROM_ADDRESS') || 'noreply@approved.app';
  return `${FROM_NAME} <${FROM_ADDRESS}>`;
}

export async function sendConfirmationEmail(email: string, actionLink: string) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured');
  }

  const from = getFromAddress();
  const subject = 'Conferma il tuo account Approved';

  const text = `Ciao!\n\nConferma il tuo account cliccando qui: ${actionLink}\n\nSe non hai richiesto questa email, ignora.`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px;">
      <h2 style="color:#0b62ff">Approved</h2>
      <p>Conferma il tuo account cliccando il pulsante qui sotto.</p>
      <p><a href="${actionLink}" style="display:inline-block;padding:12px 18px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:6px">Conferma account</a></p>
      <p style="color:#666;font-size:0.9rem">Oppure usa questo link: <br/><a href="${actionLink}">${actionLink}</a></p>
      <p style="color:#999;font-size:0.85rem">Se non hai richiesto questa email, puoi ignorarla.</p>
    </div>
  `;

  const info = await t.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });

  if (isDev) console.log('[Email] Confirmation sent via SMTP:', info.messageId);
  return info;
}

const emailApi = { sendConfirmationEmail };
export default emailApi;

export async function sendInviteEmail(email: string, inviteLink: string, invitedBy?: string | null, projectName?: string | null, role?: string | null) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured');
  }

  const from = getFromAddress();
  const subject = invitedBy
    ? `${invitedBy} ti ha invitato a collaborare su Approved`
    : `Sei stato invitato a collaborare su Approved`;

  const roleText = role === 'editor' ? 'Editor (può modificare)'
    : role === 'commenter' ? 'Commentatore (può commentare)'
    : role === 'owner' ? 'Proprietario (controllo totale)'
    : 'Viewer (può commentare)';

  const safeProjectName = escapeHtml(projectName);
  const safeInvitedBy = escapeHtml(invitedBy);
  const projectText = safeProjectName ? ` al progetto "<strong>${safeProjectName}</strong>"` : '';

  const text = `Ciao!\n\nSei stato invitato${projectName ? ` al progetto "${projectName}"` : ''} su Approved come ${roleText}.\n\nApri questo link per accettare l'invito: ${inviteLink}\n\nSe non ti aspettavi questa email, puoi ignorarla.`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px; background:#fafafa;">
      <div style="background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#0b62ff; margin-top:0;">Approved</h2>
        <p style="font-size:16px; color:#333;">
          ${safeInvitedBy ? `<strong>${safeInvitedBy}</strong> ti ha invitato` : 'Sei stato invitato'}${projectText} come <strong>${escapeHtml(roleText)}</strong>.
        </p>
        <p style="margin:24px 0;">
          <a href="${escapeHtml(inviteLink)}" style="display:inline-block;padding:14px 28px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Accetta invito
          </a>
        </p>
        <p style="color:#666;font-size:0.9rem;">Oppure copia questo link nel browser:<br/>
          <a href="${escapeHtml(inviteLink)}" style="color:#0b62ff;word-break:break-all;">${escapeHtml(inviteLink)}</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:0.85rem;margin-bottom:0;">Se non ti aspettavi questa email, puoi ignorarla in sicurezza.</p>
      </div>
    </div>
  `;

  const info = await t.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });

  if (isDev) console.log('[Email] Invite sent via SMTP to', email, '- MessageId:', info.messageId);
  return info;
}

export async function sendAdminApprovalRequest(
  userEmail: string,
  approveLink: string,
  rejectLink: string
) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured');
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[Email] ADMIN_EMAIL not configured, skipping approval notification');
    return null;
  }

  const from = getFromAddress();
  const subject = `Nuova richiesta di registrazione: ${userEmail}`;

  const text = `Un nuovo utente ha richiesto di registrarsi su Approved.\n\nEmail: ${userEmail}\n\nPer approvare: ${approveLink}\nPer rifiutare: ${rejectLink}\n\nSe non fai nulla, l'utente rimarrà in attesa di approvazione.`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px; background:#fafafa;">
      <div style="background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#0b62ff; margin-top:0;">Approved - Nuova Registrazione</h2>
        <p style="font-size:16px; color:#333;">
          Un nuovo utente ha richiesto di registrarsi:
        </p>
        <div style="background:#f5f5f5; border-left:4px solid #0b62ff; padding:16px; margin:20px 0; border-radius:4px;">
          <p style="margin:0; font-weight:600; color:#111; font-size:16px;">${userEmail}</p>
        </div>
        <p style="margin:24px 0; display:flex; gap:12px;">
          <a href="${approveLink}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Approva
          </a>
          <a href="${rejectLink}" style="display:inline-block;padding:14px 28px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin-left:12px;">
            Rifiuta
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:0.85rem;margin-bottom:0;">
          Se non rispondi, l'utente rimarrà in attesa di approvazione e non potrà accedere all'app.
        </p>
      </div>
    </div>
  `;

  const info = await t.sendMail({
    from,
    to: adminEmail,
    subject,
    text,
    html,
  });

  if (isDev) console.log('[Email] Admin approval request sent - MessageId:', info.messageId);
  return info;
}

export async function sendApprovalStatusEmail(
  userEmail: string,
  approved: boolean,
  loginLink: string,
  reason?: string
) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured');
  }

  const from = getFromAddress();
  const subject = approved
    ? 'Il tuo account Approved è stato approvato!'
    : 'Aggiornamento sulla tua richiesta di registrazione';

  let text: string;
  let html: string;

  if (approved) {
    text = `Ottima notizia!\n\nIl tuo account Approved è stato approvato. Ora puoi accedere all'app.\n\nAccedi qui: ${loginLink}\n\nBuon lavoro!`;
    html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px; background:#fafafa;">
        <div style="background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color:#16a34a; margin-top:0;">Account Approvato!</h2>
          <p style="font-size:16px; color:#333;">
            Ottima notizia! Il tuo account Approved è stato approvato.
          </p>
          <p style="margin:24px 0;">
            <a href="${loginLink}" style="display:inline-block;padding:14px 28px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
              Accedi ora
            </a>
          </p>
          <p style="color:#666;font-size:0.9rem;">
            Inizia a caricare i tuoi progetti e a gestire le revisioni con i tuoi clienti.
          </p>
        </div>
      </div>
    `;
  } else {
    text = `Ciao,\n\nPurtroppo la tua richiesta di registrazione su Approved non è stata approvata.${reason ? `\n\nMotivo: ${reason}` : ''}\n\nSe ritieni sia un errore, contattaci rispondendo a questa email.`;
    html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px; background:#fafafa;">
        <div style="background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color:#dc2626; margin-top:0;">Richiesta Non Approvata</h2>
          <p style="font-size:16px; color:#333;">
            Purtroppo la tua richiesta di registrazione su Approved non è stata approvata.
          </p>
          ${reason ? `
          <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
            <p style="margin:0; color:#7f1d1d; font-size:14px;">Motivo: ${escapeHtml(reason)}</p>
          </div>
          ` : ''}
          <p style="color:#666;font-size:0.9rem;">
            Se ritieni sia un errore, puoi contattarci rispondendo a questa email.
          </p>
        </div>
      </div>
    `;
  }

  const info = await t.sendMail({
    from,
    to: userEmail,
    subject,
    text,
    html,
  });

  if (isDev) console.log('[Email] Approval status email sent to', userEmail, '- Approved:', approved);
  return info;
}

export type UploadType = 'new_cue' | 'new_version' | 'deliverable' | 'unknown';

export async function sendNewVersionNotification(
  email: string,
  projectName: string,
  fileName: string,
  uploadedBy: string,
  projectLink: string,
  uploadType: UploadType = 'unknown',
  cueName?: string
) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured');
  }

  const from = getFromAddress();

  // Build subject and description based on upload type
  let subject: string;
  let typeLabel: string;
  let typeIcon: string;
  let actionDescription: string;

  const safeUploadedBy = escapeHtml(uploadedBy);
  const safeProjectName2 = escapeHtml(projectName);
  const safeFileName = escapeHtml(fileName);
  const safeCueName = escapeHtml(cueName);
  const safeProjectLink = escapeHtml(projectLink);

  switch (uploadType) {
    case 'new_cue':
      subject = `Nuova cue aggiunta su "${projectName}"`;
      typeLabel = 'Nuova Cue';
      typeIcon = '🎬';
      actionDescription = `ha aggiunto una nuova cue${safeCueName ? ` "<strong>${safeCueName}</strong>"` : ''} su`;
      break;
    case 'new_version':
      subject = `Nuova versione caricata su "${projectName}"`;
      typeLabel = cueName ? `Nuova versione per "${cueName}"` : 'Nuova Versione';
      typeIcon = '🔄';
      actionDescription = `ha caricato una nuova versione${safeCueName ? ` per la cue "<strong>${safeCueName}</strong>"` : ''} su`;
      break;
    case 'deliverable':
      subject = `Nuovo file tecnico su "${projectName}"`;
      typeLabel = cueName ? `File tecnico per "${cueName}"` : 'File Tecnico';
      typeIcon = '📦';
      actionDescription = `ha caricato un file tecnico${safeCueName ? ` per la cue "<strong>${safeCueName}</strong>"` : ''} su`;
      break;
    default:
      subject = `Nuovo file caricato su "${projectName}"`;
      typeLabel = 'Nuovo File';
      typeIcon = '📁';
      actionDescription = 'ha caricato un nuovo file su';
  }

  const text = `Ciao!\n\n${uploadedBy} ${actionDescription.replace(/<[^>]*>/g, '')} "${projectName}":\n\nFile: ${fileName}\n\nVai al progetto per ascoltarlo e lasciare i tuoi commenti: ${projectLink}\n\nBuon lavoro!`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px; background:#fafafa;">
      <div style="background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#0b62ff; margin-top:0;">Approved</h2>
        <p style="font-size:16px; color:#333;">
          <strong>${safeUploadedBy}</strong> ${actionDescription} <strong>"${safeProjectName2}"</strong>
        </p>
        <div style="background:#f5f5f5; border-left:4px solid #0b62ff; padding:16px; margin:20px 0; border-radius:4px;">
          <p style="margin:0; color:#666; font-size:14px;">${typeIcon} ${escapeHtml(typeLabel)}:</p>
          <p style="margin:8px 0 0 0; font-weight:600; color:#111; font-size:15px;">${safeFileName}</p>
        </div>
        <p style="margin:24px 0;">
          <a href="${safeProjectLink}" style="display:inline-block;padding:14px 28px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Vai al progetto
          </a>
        </p>
        <p style="color:#666;font-size:0.9rem;">
          Ascolta il file e lascia i tuoi commenti per aiutare il team a migliorare il progetto.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:0.85rem;margin-bottom:0;">
          Ricevi questa email perché sei collaboratore del progetto "${safeProjectName2}".
        </p>
      </div>
    </div>
  `;

  const info = await t.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });

  if (isDev) console.log('[Email] New version notification sent to', email, '- MessageId:', info.messageId);
  return info;
}
