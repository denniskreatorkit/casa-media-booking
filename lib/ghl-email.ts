/**
 * Go High Level email integration for Casa Media booking confirmations.
 *
 * Uses the GHL REST API directly (sub-account credentials from env).
 * Called server-side after a booking is confirmed in the DB.
 *
 * Recipients:
 *   - Real estate agent (agentEmail)
 *   - Seller (sellerEmail)
 *   - Back-office (GHL_BACKOFFICE_EMAIL env var, optional)
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-04-15";

export interface BookingEmailData {
  bookingId: string;
  propertyAddress: string;
  packageName: string;
  durationMinutes: number;
  startAt: Date;
  endAt: Date;
  agentName: string;
  agentEmail: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string;
  photographerName: string;
  photographerEmail: string;
}

function ghlHeaders() {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new Error("GHL_API_KEY is not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
  };
}

/** Upsert a contact in GHL and return its contactId. */
async function upsertContact(params: {
  name: string;
  email: string;
  phone?: string;
  tags?: string[];
}): Promise<string> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID is not configured");

  const res = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
    method: "POST",
    headers: ghlHeaders(),
    body: JSON.stringify({
      locationId,
      name: params.name,
      email: params.email,
      phone: params.phone ?? undefined,
      tags: params.tags ?? [],
      source: "Casa Media Booking",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL upsertContact failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // GHL returns { contact: { id: "..." } }
  const contactId = data?.contact?.id;
  if (!contactId) throw new Error("GHL upsertContact: no contactId in response");
  return contactId;
}

/** Send an email to a GHL contact. */
async function sendEmail(params: {
  contactId: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}): Promise<void> {
  const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
    method: "POST",
    headers: ghlHeaders(),
    body: JSON.stringify({
      type: "Email",
      contactId: params.contactId,
      subject: params.subject,
      html: params.html,
      emailCc: params.cc ?? [],
      emailBcc: params.bcc ?? [],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL sendEmail failed (${res.status}): ${text}`);
  }
}

/** Build the HTML body for a booking confirmation email. */
function buildConfirmationHtml(data: BookingEmailData, recipientName: string): string {
  const dateStr = data.startAt.toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Amsterdam",
  });
  const startTimeStr = data.startAt.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  const endTimeStr = data.endAt.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Boekingsbevestiging – Casa Media</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; }
    .header p { color: #aaa; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 40px; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 24px; }
    .detail-block { background: #f9f9f9; border-left: 4px solid #e8c55a; border-radius: 4px; padding: 20px 24px; margin-bottom: 24px; }
    .detail-block h2 { margin: 0 0 16px; font-size: 16px; color: #1a1a2e; }
    .detail-row { display: flex; margin-bottom: 10px; font-size: 14px; }
    .detail-label { color: #666; width: 160px; flex-shrink: 0; font-weight: bold; }
    .detail-value { color: #222; }
    .next-steps { font-size: 14px; color: #555; line-height: 1.7; }
    .next-steps ul { padding-left: 20px; }
    .footer { background: #f4f4f4; padding: 20px 40px; text-align: center; font-size: 12px; color: #999; }
    .footer a { color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Casa Media</h1>
      <p>Real Estate Photography &amp; Media</p>
    </div>
    <div class="body">
      <p class="greeting">Beste ${recipientName},</p>
      <p style="font-size:15px;color:#333;">
        Uw boeking bij Casa Media is bevestigd. Hieronder vindt u de details van de afspraak.
      </p>

      <div class="detail-block">
        <h2>Boekingsdetails</h2>
        <div class="detail-row">
          <span class="detail-label">Boeking ID</span>
          <span class="detail-value">${data.bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Datum</span>
          <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tijd</span>
          <span class="detail-value">${startTimeStr} – ${endTimeStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Adres woning</span>
          <span class="detail-value">${data.propertyAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Pakket</span>
          <span class="detail-value">${data.packageName} (${data.durationMinutes} min)</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Fotograaf</span>
          <span class="detail-value">${data.photographerName}</span>
        </div>
      </div>

      <div class="detail-block">
        <h2>Contactgegevens</h2>
        <div class="detail-row">
          <span class="detail-label">Makelaar</span>
          <span class="detail-value">${data.agentName} &lt;${data.agentEmail}&gt;</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Verkoper</span>
          <span class="detail-value">${data.sellerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Telefoon verkoper</span>
          <span class="detail-value">${data.sellerPhone}</span>
        </div>
      </div>

      <div class="next-steps">
        <strong>Volgende stappen:</strong>
        <ul>
          <li>De fotograaf neemt indien nodig contact op voor instructies.</li>
          <li>Zorg dat de woning klaar is voor de shoot op de geplande datum en tijd.</li>
          <li>Bij vragen of wijzigingen kunt u contact opnemen via <a href="mailto:info@casamedia.nl">info@casamedia.nl</a>.</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Casa Media &bull; South-Holland, Nederland &bull; <a href="mailto:info@casamedia.nl">info@casamedia.nl</a></p>
      <p>Dit is een automatisch gegenereerde bevestigingsmail. Gelieve niet te reageren op dit e-mailadres.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send booking confirmation emails to all relevant parties via GHL.
 * Errors are caught and logged — a GHL failure must not block the booking response.
 */
export async function sendBookingConfirmationEmails(
  data: BookingEmailData
): Promise<void> {
  const locationId = process.env.GHL_LOCATION_ID;
  const apiKey = process.env.GHL_API_KEY;
  if (!locationId || !apiKey) {
    console.warn("[GHL] GHL_API_KEY or GHL_LOCATION_ID not set — skipping confirmation emails");
    return;
  }

  const backofficeEmail = process.env.GHL_BACKOFFICE_EMAIL ?? null;
  const subject = `Boekingsbevestiging – ${data.propertyAddress} – ${data.startAt.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}`;

  const recipients: Array<{ name: string; email: string; phone?: string; tags: string[] }> = [
    { name: data.agentName, email: data.agentEmail, tags: ["real-estate-agent", "booking-confirmation"] },
    { name: data.sellerName, email: data.sellerEmail, phone: data.sellerPhone, tags: ["seller", "booking-confirmation"] },
  ];

  for (const recipient of recipients) {
    try {
      const contactId = await upsertContact(recipient);
      const html = buildConfirmationHtml(data, recipient.name);
      const bcc = backofficeEmail ? [backofficeEmail] : [];
      await sendEmail({ contactId, subject, html, bcc });
      console.log(`[GHL] Confirmation email sent to ${recipient.email}`);
    } catch (err) {
      console.error(`[GHL] Failed to send confirmation to ${recipient.email}:`, err);
    }
  }
}
