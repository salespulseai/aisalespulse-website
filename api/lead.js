// Early-access lead handler.
// Emails the team via Resend when RESEND_API_KEY is set (Vercel env var).
// If the key is missing or Resend fails, returns a non-2xx so the browser
// falls back to a pre-filled mailto — the lead is never silently lost.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = (body.name || '').toString().trim().slice(0, 200);
    const contact = (body.contact || '').toString().trim().slice(0, 200);
    const reps = (body.reps || '').toString().trim().slice(0, 50);
    const lang = (body.lang || '').toString().trim().slice(0, 8);

    if (!name || !contact) {
      res.status(400).json({ error: 'missing_fields' });
      return;
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      // No email provider configured yet — signal the client to use mailto fallback.
      res.status(501).json({ error: 'email_not_configured' });
      return;
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Pulse Website <noreply@aisalespulse.com>',
        to: ['hello@aisalespulse.com'],
        reply_to: contact.includes('@') ? contact : undefined,
        subject: `New early-access request — ${name}`,
        text: `Name: ${name}\nEmail / WhatsApp: ${contact}\nSales reps: ${reps || '-'}\nLanguage: ${lang || '-'}`,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'email_send_failed', detail: detail.slice(0, 300) });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e).slice(0, 200) });
  }
}
