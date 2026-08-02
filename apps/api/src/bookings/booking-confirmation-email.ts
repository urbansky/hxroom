export function buildBookingConfirmationEmail(
  clientName: string,
  offerName: string,
  dayTimeLabel: string,
  confirmUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 16px;background:#f5f5f2;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#8B9E8A;padding:28px 32px;border-radius:8px 8px 0 0;text-align:center;">
      <span style="font-family:Georgia,serif;font-size:26px;color:#fff;letter-spacing:0.06em;">HxRoom</span>
    </td></tr>
    <tr><td style="background:#fff;padding:40px 32px;border-radius:0 0 8px 8px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;">Hallo ${clientName},</h2>
      <p style="margin:0 0 20px;color:#555;line-height:1.65;font-size:15px;">
        bitte bestätige deinen Termin – erst dann ist er für dich reserviert.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f2;border-radius:8px;margin:0 0 28px;">
        <tr><td style="padding:16px 20px;font-size:14px;color:#333;">
          <strong>${offerName}</strong><br>
          ${dayTimeLabel}
        </td></tr>
      </table>
      <a href="${confirmUrl}"
         style="display:inline-block;background:#8B9E8A;color:#fff;text-decoration:none;
                padding:13px 28px;border-radius:6px;font-weight:600;font-size:15px;">
        Termin bestätigen
      </a>
      <p style="margin:32px 0 0;font-size:13px;color:#999;line-height:1.6;">
        Der Link ist 30 Minuten gültig. Ohne Bestätigung wird der Termin automatisch wieder freigegeben.<br>
        Falls du diesen Termin nicht angefragt hast, kannst du diese E-Mail ignorieren.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
