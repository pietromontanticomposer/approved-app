import nodemailer from 'nodemailer';

let transporter: any = null;

function getTransporter() {
  // Read env vars at runtime, not at module load time
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[Email] SMTP not configured - SMTP_USER:', !!SMTP_USER, 'SMTP_PASS:', !!SMTP_PASS);
    return null;
  }

  // Recreate transporter each time to ensure fresh env vars
  // Use Gmail service directly - nodemailer handles the connection details
  // This avoids DNS resolution issues on serverless platforms like Vercel
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

function getFromAddress() {
  const FROM_NAME = process.env.FROM_NAME || 'Approved';
  const FROM_ADDRESS = process.env.FROM_ADDRESS || 'noreply@approved.app';
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

  console.log('[Email] Confirmation sent via SMTP:', info.messageId);
  return info;
}

export default { sendConfirmationEmail };

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
    : 'Viewer (può visualizzare)';

  const projectText = projectName ? ` al progetto "<strong>${projectName}</strong>"` : '';

  const text = `Ciao!\n\nSei stato invitato${projectName ? ` al progetto "${projectName}"` : ''} su Approved come ${roleText}.\n\nApri questo link per accettare l'invito: ${inviteLink}\n\nSe non ti aspettavi questa email, puoi ignorarla.`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111; max-width:600px; margin:0 auto; padding:20px; background:#fafafa;">
      <div style="background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#0b62ff; margin-top:0;">Approved</h2>
        <p style="font-size:16px; color:#333;">
          ${invitedBy ? `<strong>${invitedBy}</strong> ti ha invitato` : 'Sei stato invitato'}${projectText} come <strong>${roleText}</strong>.
        </p>
        <p style="margin:24px 0;">
          <a href="${inviteLink}" style="display:inline-block;padding:14px 28px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Accetta invito
          </a>
        </p>
        <p style="color:#666;font-size:0.9rem;">Oppure copia questo link nel browser:<br/>
          <a href="${inviteLink}" style="color:#0b62ff;word-break:break-all;">${inviteLink}</a>
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

  console.log('[Email] Invite sent via SMTP to', email, '- MessageId:', info.messageId);
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

  switch (uploadType) {
    case 'new_cue':
      subject = `Nuova cue aggiunta su "${projectName}"`;
      typeLabel = 'Nuova Cue';
      typeIcon = '🎬';
      actionDescription = `ha aggiunto una nuova cue${cueName ? ` "<strong>${cueName}</strong>"` : ''} su`;
      break;
    case 'new_version':
      subject = `Nuova versione caricata su "${projectName}"`;
      typeLabel = cueName ? `Nuova versione per "${cueName}"` : 'Nuova Versione';
      typeIcon = '🔄';
      actionDescription = `ha caricato una nuova versione${cueName ? ` per la cue "<strong>${cueName}</strong>"` : ''} su`;
      break;
    case 'deliverable':
      subject = `Nuovo file tecnico su "${projectName}"`;
      typeLabel = cueName ? `File tecnico per "${cueName}"` : 'File Tecnico';
      typeIcon = '📦';
      actionDescription = `ha caricato un file tecnico${cueName ? ` per la cue "<strong>${cueName}</strong>"` : ''} su`;
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
          <strong>${uploadedBy}</strong> ${actionDescription} <strong>"${projectName}"</strong>
        </p>
        <div style="background:#f5f5f5; border-left:4px solid #0b62ff; padding:16px; margin:20px 0; border-radius:4px;">
          <p style="margin:0; color:#666; font-size:14px;">${typeIcon} ${typeLabel}:</p>
          <p style="margin:8px 0 0 0; font-weight:600; color:#111; font-size:15px;">${fileName}</p>
        </div>
        <p style="margin:24px 0;">
          <a href="${projectLink}" style="display:inline-block;padding:14px 28px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Vai al progetto
          </a>
        </p>
        <p style="color:#666;font-size:0.9rem;">
          Ascolta il file e lascia i tuoi commenti per aiutare il team a migliorare il progetto.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:0.85rem;margin-bottom:0;">
          Ricevi questa email perché sei collaboratore del progetto "${projectName}".
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

  console.log('[Email] New version notification sent to', email, '- MessageId:', info.messageId);
  return info;
}
