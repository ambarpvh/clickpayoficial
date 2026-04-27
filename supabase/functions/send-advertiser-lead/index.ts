// Edge function: send-advertiser-lead
// Sends advertiser lead notifications to clickpayoficial@gmail.com via Resend.
// Public endpoint (verify_jwt = false) — payload is also persisted in advertiser_leads table.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "oficialclickpay@gmail.com";

interface LeadPayload {
  full_name: string;
  email: string;
  phone?: string | null;
  ad_link: string;
  ad_description?: string | null;
  clicks_amount: number;
  total_value: number;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const buildHtml = (lead: LeadPayload) => `
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
    <h1 style="margin:0 0 8px;font-size:20px;color:#0f9d58;">📢 Novo Pedido de Anúncio</h1>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">Recebido em ${new Date().toLocaleString("pt-BR")}</p>

    <h2 style="font-size:15px;margin:16px 0 8px;color:#111;">Dados do Anunciante</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#666;width:140px;">Nome:</td><td><strong>${escapeHtml(lead.full_name)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#666;">Email:</td><td>${escapeHtml(lead.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Telefone:</td><td>${escapeHtml(lead.phone ?? "-")}</td></tr>
    </table>

    <h2 style="font-size:15px;margin:20px 0 8px;color:#111;">Anúncio</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#666;width:140px;">Link:</td><td><a href="${escapeHtml(lead.ad_link)}" style="color:#0f9d58;">${escapeHtml(lead.ad_link)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#666;vertical-align:top;">Descrição:</td><td>${escapeHtml(lead.ad_description ?? "-")}</td></tr>
    </table>

    <h2 style="font-size:15px;margin:20px 0 8px;color:#111;">Pedido</h2>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;font-size:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Cliques:</span><strong>${lead.clicks_amount.toLocaleString("pt-BR")}</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Valor por clique:</span><strong>R$ 0,25</strong></div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid #bbf7d0;padding-top:8px;margin-top:8px;font-size:16px;"><span><strong>Total:</strong></span><strong style="color:#0f9d58;">${formatBRL(lead.total_value)}</strong></div>
    </div>

    <p style="margin-top:24px;color:#888;font-size:12px;">Esta notificação foi gerada automaticamente pelo ClickPay.</p>
  </div>
</body></html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lead = (await req.json()) as LeadPayload;

    if (!lead?.full_name || !lead?.email || !lead?.ad_link || !lead?.clicks_amount) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured — skipping email send");
      return new Response(
        JSON.stringify({ ok: true, emailed: false, reason: "no_api_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = buildHtml(lead);
    const subject = `📢 Novo anunciante: ${lead.full_name} — ${lead.clicks_amount} cliques (${formatBRL(lead.total_value)})`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClickPay Anunciantes <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        reply_to: lead.email,
        subject,
        html,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Resend error", resp.status, data);
      return new Response(
        JSON.stringify({ ok: false, emailed: false, error: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, emailed: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-advertiser-lead error", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
