import "server-only";
import { prisma } from "./prisma";
import { formatLKR } from "./format";
import { ORDER_STATUS_LABEL } from "./constants";

type OrderLike = { id: string; number: string; name: string; phone: string; email: string; total: number; status: string; paymentMethod: string; trackingNumber?: string | null; courier?: string | null };

/** Normalise Sri Lankan mobile numbers to 947XXXXXXXX for SMS gateways. */
function msisdn(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("94")) return d;
  if (d.startsWith("0")) return `94${d.slice(1)}`;
  return `94${d}`;
}

async function sendSMS(to: string, message: string, orderId?: string) {
  const { NOTIFYLK_USER_ID: user, NOTIFYLK_API_KEY: key, NOTIFYLK_SENDER_ID: sender } = process.env;
  let status = "LOGGED";
  if (user && key) {
    try {
      const url = `https://app.notify.lk/api/v1/send?user_id=${user}&api_key=${key}&sender_id=${encodeURIComponent(sender ?? "NotifyDEMO")}&to=${msisdn(to)}&message=${encodeURIComponent(message)}`;
      const r = await fetch(url);
      status = r.ok ? "SENT" : "FAILED";
    } catch {
      status = "FAILED";
    }
  }
  await prisma.notificationLog.create({ data: { orderId, channel: "SMS", to, message, status } });
}

async function sendEmail(to: string, subject: string, html: string, orderId?: string) {
  let status = "LOGGED";
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Skinora <orders@skinora.lk>", to, subject, html }),
      });
      status = r.ok ? "SENT" : "FAILED";
    } catch {
      status = "FAILED";
    }
  }
  await prisma.notificationLog.create({ data: { orderId, channel: "EMAIL", to, subject, message: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500), status } });
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const emailShell = (title: string, body: string) => `
<div style="background:#FAF7F2;padding:40px 0;font-family:Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:48px">
    <p style="font-family:Georgia,serif;font-size:26px;letter-spacing:8px;text-align:center;margin:0 0 32px">SKINORA</p>
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="font-size:12px;color:#8A857E;margin-top:40px">Questions? Reply to this email or WhatsApp us on +94 77 123 4567.<br/>Skinora Imports (Pvt) Ltd · 42 Flower Road, Colombo 07</p>
  </div>
</div>`;

/** Sends SMS + email for an order lifecycle event, and records both in the notification log. */
export async function notifyOrder(o: OrderLike, event: "placed" | "paid" | "status") {
  const first = o.name.split(" ")[0];
  const track = `${site()}/track?order=${o.number}`;
  let sms: string;
  let subject: string;
  let body: string;
  if (event === "placed") {
    sms =
      o.paymentMethod === "BANK_TRANSFER"
        ? `Skinora: Thank you ${first}! Order ${o.number} (${formatLKR(o.total)}) is reserved. Please transfer using ${o.number} as the reference. ${track}`
        : `Skinora: Thank you ${first}! Order ${o.number} is confirmed. Total ${formatLKR(o.total)}. Track: ${track}`;
    subject = `Your Skinora order ${o.number}`;
    body = `<p>Dear ${first},</p><p>Thank you for your order. We're preparing it with care in Colombo.</p><p><b>Order:</b> ${o.number}<br/><b>Total:</b> ${formatLKR(o.total)}</p><p><a href="${track}" style="color:#7A5E2C">Track your order</a></p>`;
  } else if (event === "paid") {
    sms = `Skinora: Payment received for order ${o.number}. We'll let you know when it's on its way.`;
    subject = `Payment received · ${o.number}`;
    body = `<p>Dear ${first},</p><p>We've received your payment for order ${o.number}. Thank you.</p>`;
  } else {
    const label = ORDER_STATUS_LABEL[o.status] ?? o.status;
    const extra = o.status === "SHIPPED" && o.trackingNumber ? ` ${o.courier ?? "Courier"} tracking: ${o.trackingNumber}.` : "";
    sms = `Skinora: Order ${o.number} is now ${label.toLowerCase()}.${extra} ${track}`;
    subject = `Order ${o.number}: ${label}`;
    body = `<p>Dear ${first},</p><p>Your order ${o.number} is now <b>${label.toLowerCase()}</b>.${extra}</p><p><a href="${track}" style="color:#7A5E2C">View order</a></p>`;
  }
  await Promise.all([sendSMS(o.phone, sms, o.id), sendEmail(o.email, subject, emailShell(subject, body), o.id)]);
}
