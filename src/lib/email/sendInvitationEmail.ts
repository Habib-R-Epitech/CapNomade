import 'server-only';
import { sendEmail } from '@/lib/email/resend';
import { siteConfig } from '@/config/site';

export async function sendInvitationEmail(params: {
  toEmail: string;
  inviterName: string;
  tripTitle: string;
  token: string;
  customMessage: string | null;
}) {
  const url = `${siteConfig.url}/invitations?token=${encodeURIComponent(params.token)}`;
  const safeInviter = escapeHtml(params.inviterName);
  const safeTitle = escapeHtml(params.tripTitle);
  const safeMessage = params.customMessage ? `<blockquote style="margin:1.5em 0;padding:.75em 1em;background:#f5efe1;border-left:3px solid #f04923;color:#444;font-style:italic;">${escapeHtml(params.customMessage)}</blockquote>` : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:-apple-system,BlinkMacSystemFont,Inter,Helvetica,Arial,sans-serif;background:#fbf9f4;padding:32px 16px;color:#1a2a36;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;box-shadow:0 10px 30px -10px rgba(15,30,45,.12);">
    <tr><td>
      <p style="font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#2f6c8e;margin:0 0 8px 0;">CapNomade — invitation</p>
      <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">${safeInviter} vous invite à rejoindre « ${safeTitle} »</h1>
      <p style="line-height:1.6;color:#3b4a55;margin:0 0 16px;">Sur CapNomade, vous pourrez consulter le planning, les dépenses, les trajets et tous les documents partagés du voyage. Vous gardez la main pour accepter ou refuser.</p>
      ${safeMessage}
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 22px;background:#295976;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Voir l&apos;invitation</a>
      </p>
      <p style="font-size:12px;color:#7a8a98;line-height:1.6;">Ce lien est unique et expire dans 14 jours. Si vous n&apos;attendiez pas cette invitation, vous pouvez l&apos;ignorer en toute sécurité.</p>
    </td></tr>
  </table>
  <p style="text-align:center;font-size:12px;color:#9aa6b1;margin-top:24px;">${siteConfig.name} · privé par défaut · vos données vous appartiennent.</p>
</body>
</html>`;

  const text = `${params.inviterName} vous invite à rejoindre « ${params.tripTitle} » sur CapNomade.
${params.customMessage ? `\nMessage : ${params.customMessage}\n` : ''}
Ouvrir l'invitation : ${url}

Le lien expire dans 14 jours. Privé par défaut. Vos données vous appartiennent.`;

  return sendEmail({
    to: params.toEmail,
    subject: `${params.inviterName} vous invite sur ${siteConfig.name}`,
    html,
    text,
    headers: { 'X-Entity-Ref-ID': params.token },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
