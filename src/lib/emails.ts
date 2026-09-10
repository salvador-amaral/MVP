import "server-only";

import { Resend } from "resend";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Email layer (Resend). Templates are Portuguese-first plain HTML so they can
// be rendered without any React-email dependency. In local development with no
// RESEND_API_KEY configured we log instead of failing.
// ---------------------------------------------------------------------------

// The .env.example ships with a placeholder that must NOT be used for real
// sending — treat it the same as "no key" so dev mode logs instead of failing.
const PLACEHOLDER_KEY = /^re_x{6,}$/;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key && !PLACEHOLDER_KEY.test(key) ? new Resend(key) : null;
}

// The Reply-To is optional and best-effort: a malformed address must never stop
// an email from being delivered, so invalid values are dropped and the send
// falls back to the platform default (no Reply-To header).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeReplyTo(value?: string): string | undefined {
  const candidate = value?.trim();
  return candidate && EMAIL_RE.test(candidate) ? candidate : undefined;
}

/**
 * Outcome of a send attempt. The email layer never throws: a delivery problem
 * is a value the caller records, not an exception that aborts a server action
 * whose database work has already committed.
 */
export type EmailResult = { ok: true; dev?: true } | { ok: false; error: string };

/**
 * Wraps a Resend call so that no failure mode escapes as an exception — an
 * unverified domain, a rejected recipient or a network error all come back as
 * `{ ok: false }` for the caller to persist.
 */
async function safeSend(
  label: string,
  send: () => Promise<{ error: { message: string } | null }>
): Promise<EmailResult> {
  try {
    const { error } = await send();
    if (error) {
      console.error(`Resend ${label} error: ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Resend ${label} threw: ${message}`);
    return { ok: false, error: message };
  }
}

/** Escapes text while keeping the author's line breaks (custom messages). */
function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

/** Subjects must stay on one line — an embedded CR/LF is header injection. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

const brand = "#1d4ed8";
const bg = "#f4f6fb";
const text = "#0f172a";
const muted = "#64748b";

/** Escapes user-provided text inserted into HTML emails. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function layoutHtml(body: string, replyTo?: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
  <body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
            <tr><td style="padding:0 0 16px 0;">
              <div style="color:${brand};font-weight:700;font-size:18px;">✦ PrepApp</div>
            </td></tr>
            <tr>
              <td style="background:#ffffff;border-radius:12px;padding:32px;color:${text};">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 0 0;color:${muted};font-size:12px;text-align:center;">
                ${
                  replyTo
                    ? "Pode responder a este email para falar diretamente com o escritório."
                    : "Enviado automaticamente — não responda a este email."
                }<br/>
                Documentos partilhados de forma segura através de ligações temporárias.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="border-radius:8px;background:${brand};">
        <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function footerLink(url: string): string {
  return `<div style="font-size:13px;color:${muted};">Se o botão não funcionar, copie e cole no navegador:<br/><a href="${url}" style="color:${brand};word-break:break-all;">${url}</a></div>`;
}

export interface InviteEmailData {
  to: string;
  orgName: string;
  clientName: string;
  magicUrl: string;
  dueDate: Date | null;
  customMessage?: string;
  itemCount: number;
  /** Optional office inbox used as Reply-To. Invalid/empty = platform default. */
  replyTo?: string;
}

export async function sendRequestInviteEmail(data: InviteEmailData) {
  const client = getClient();
  if (!client) {
    console.info(`[email:dev] convite para ${data.to}: ${data.magicUrl}`);
    return { ok: true as const, dev: true };
  }

  const replyTo = normalizeReplyTo(data.replyTo);

  const due = data.dueDate
    ? `Tem até ao dia <strong>${format(data.dueDate, "dd/MM/yyyy", { locale: ptBR })}</strong> para enviar a documentação.`
    : "Agradecemos o envio o mais rapidamente possível.";

  const html = layoutHtml(`
    <h1 style="margin:0 0 8px 0;font-size:20px;">Olá, ${escapeHtml(data.clientName)} 👋</h1>
    <p style="color:${muted};margin:0 0 20px 0;">${escapeHtml(data.orgName)} preparou uma lista de documentos para si.</p>
    <p>Prepare os seguintes documentos e carregue-os através da sua ligação pessoal e segura (${data.itemCount} itens). ${due}</p>
    ${data.customMessage ? `<p style="background:${bg};border-radius:8px;padding:12px;font-style:italic;">${escapeMultiline(data.customMessage)}</p>` : ""}
    ${buttonHtml(data.magicUrl, "Abrir a minha lista de documentos")}
    ${footerLink(data.magicUrl)}
    <p style="font-size:12px;color:${muted};">A ligação é válida por 30 dias e apenas para o destinatário.</p>
  `, replyTo);

  return safeSend("invite", () =>
    client.emails.send({
      from: process.env.EMAIL_FROM || "PrepApp <no-reply@prepapp.dev>",
      to: data.to,
      replyTo,
      subject: `${singleLine(data.orgName)} — lista de documentos para preparar`,
      html,
    })
  );
}

export interface ReminderEmailData {
  to: string;
  orgName: string;
  clientName: string;
  magicUrl: string;
  reason: string; // human readable reason in PT ("faltam 3 dias para a data limite")
  /** Optional office inbox used as Reply-To. Invalid/empty = platform default. */
  replyTo?: string;
}

export async function sendReminderEmail(data: ReminderEmailData) {
  const client = getClient();
  if (!client) {
    console.info(`[email:dev] lembrete para ${data.to}: ${data.magicUrl}`);
    return { ok: true as const, dev: true };
  }

  const replyTo = normalizeReplyTo(data.replyTo);

  const html = layoutHtml(`
    <h1 style="margin:0 0 8px 0;font-size:20px;">Lembrete — ${escapeHtml(data.orgName)}</h1>
    <p style="color:${muted};">Olá, ${escapeHtml(data.clientName)}. Este é apenas um lembrete amigável:</p>
    <p><strong>${escapeHtml(data.reason)}</strong></p>
    <p>Ainda não recebemos todos os documentos da sua lista. Pode concluir em poucos minutos a partir do telemóvel.</p>
    ${buttonHtml(data.magicUrl, "Continuar a minha lista")}
    ${footerLink(data.magicUrl)}
    <p style="font-size:12px;color:${muted};">Se já enviou tudo, ignore este email.</p>
  `, replyTo);

  return safeSend("reminder", () =>
    client.emails.send({
      from: process.env.EMAIL_FROM || "PrepApp <no-reply@prepapp.dev>",
      to: data.to,
      replyTo,
      subject: `Lembrete: documentação pendente — ${singleLine(data.orgName)}`,
      html,
    })
  );
}

export interface RejectionEmailData {
  to: string;
  orgName: string;
  clientName: string;
  magicUrl: string;
  itemTitle: string;
  reason?: string;
  /** Optional office inbox used as Reply-To. Invalid/empty = platform default. */
  replyTo?: string;
}

/** Sent automatically when an accountant rejects a submitted item. */
export async function sendRejectionEmail(data: RejectionEmailData) {
  const client = getClient();
  if (!client) {
    console.info(`[email:dev] rejeição para ${data.to}: ${data.magicUrl}`);
    return { ok: true as const, dev: true };
  }

  const replyTo = normalizeReplyTo(data.replyTo);

  const reasonHtml = data.reason
    ? `<p style="background:${bg};border-radius:8px;padding:12px;"><strong>Motivo indicado:</strong> ${escapeHtml(data.reason)}</p>`
    : "";
  const itemHtml = escapeHtml(data.itemTitle);

  const html = layoutHtml(`
    <h1 style="margin:0 0 8px 0;font-size:20px;">Documento por corrigir</h1>
    <p style="color:${muted};">Olá, ${escapeHtml(data.clientName)}.</p>
    <p>O documento <strong>«${itemHtml}»</strong> que enviou foi revisto e <strong>não pôde ser aceite</strong>.</p>
    ${reasonHtml}
    <p>Carregue uma nova versão do documento através da sua ligação pessoal — demora apenas alguns minutos.</p>
    ${buttonHtml(data.magicUrl, "Reenviar o documento")}
    ${footerLink(data.magicUrl)}
  `, replyTo);

  return safeSend("rejection", () =>
    client.emails.send({
      from: process.env.EMAIL_FROM || "PrepApp <no-reply@prepapp.dev>",
      to: data.to,
      replyTo,
      subject: `Documento por corrigir — ${singleLine(data.orgName)}`,
      html,
    })
  );
}
