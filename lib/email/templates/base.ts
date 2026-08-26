// lib/email/templates/base.ts — Professional Base HTML Template
// Referensi kualitas: Tokopedia, Shopee, Traveloka
// Brand: Ready Stok — Orange (#F97316), White, Black

export interface BaseTemplateVars {
  title: string;
  preheader?: string;
  recipientName?: string;
  content: string;
  ctaUrl?: string;
  ctaLabel?: string;
  /** Nomor pesanan untuk ditampilkan di header info bar */
  orderId?: string;
  /** Nomor komplain untuk ditampilkan di header info bar */
  komplainId?: string;
  /** Status badge text */
  statusBadge?: string;
  /** Info tambahan di bagian bawah body */
  infoRows?: Array<{ label: string; value: string; highlight?: boolean }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://jogjadoelan.com";
const APP_NAME = "Jogjadoelan";
const TAGLINE = "Toko Helm Jadul Yogyakarta";
const SUPPORT_EMAIL = "jogjadoelantechforlocal.id@gmail.com";
const SUPPORT_WA = "6281244736703";

function headerHTML(): string {
  return `
    <div style="background: #F97316; padding: 12px 20px;">
      <div style="font-size: 20px; font-weight: 600; color: #FFFFFF;">Jogjadoelan</div>
    </div>`;
}

function infoBarHTML(orderId?: string, komplainId?: string, statusBadge?: string): string {
  const displayId = orderId ?? komplainId;
  const idLabel = komplainId ? "Nomor Komplain" : "Nomor Pesanan";
  if (!displayId && !statusBadge) return "";
  return `
    <div style="background: #FFF7ED; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid #FED7AA;">
      ${displayId ? `<div style="font-size: 13px; color: #9A3412; margin-bottom: 4px;">${idLabel}</div><div style="font-size: 16px; font-weight: 700; color: #111827;">${displayId}</div>` : ''}
      ${statusBadge ? `<div style="margin-top: 8px;"><span style="display: inline-block; background: #F97316; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${statusBadge}</span></div>` : ''}
    </div>`;
}

function infoRowsHTML(rows?: Array<{ label: string; value: string; highlight?: boolean }>): string {
  if (!rows || rows.length === 0) return "";
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${rows.map(r => `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px; border-bottom: 1px solid #F3F4F6;">${r.label}</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: ${r.highlight ? '700' : '500'}; color: ${r.highlight ? '#111827' : '#374151'}; border-bottom: 1px solid #F3F4F6;">${r.value}</td>
        </tr>
      `).join('')}
    </table>`;
}

function ctaBlockHTML(ctaUrl?: string, ctaLabel?: string): string {
  if (!ctaUrl || !ctaLabel) return "";
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${ctaUrl}" target="_blank" rel="noopener"
         style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: #FFFFFF; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
        ${ctaLabel}
      </a>
    </div>`;
}

function footerHTML(): string {
  return `
    <div style="background: #111827; padding: 28px 24px 24px; text-align: center;">
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">${APP_NAME}</div>
      <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 16px;">${TAGLINE}</div>
      
      <div style="font-size: 12px; color: #D1D5DB; line-height: 1.8; margin-bottom: 12px;">
        <span>📧 <a href="mailto:${SUPPORT_EMAIL}" style="color: #F97316; text-decoration: none;">${SUPPORT_EMAIL}</a></span>
        <span style="margin: 0 8px; color: #4B5563;">|</span>
        <span>💬 <a href="https://wa.me/${SUPPORT_WA}" style="color: #F97316; text-decoration: none;">${SUPPORT_WA}</a></span>
      </div>
      
      <div style="font-size: 11px; color: #6B7280; line-height: 1.6;">
        <p style="margin: 0 0 6px;">Email ini dikirim otomatis oleh sistem ${APP_NAME}. Harap tidak membalas email ini.</p>
        <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} ${APP_NAME}. Seluruh hak cipta dilindungi.</p>
        <p style="margin: 0;">
          <a href="${APP_URL}" style="color: #6B7280; text-decoration: underline;">${APP_URL}</a>
          <span style="margin: 0 6px;">·</span>
          <a href="${APP_URL}/privasi" style="color: #6B7280; text-decoration: underline;">Kebijakan Privasi</a>
          <span style="margin: 0 6px;">·</span>
          <a href="${APP_URL}/syarat" style="color: #6B7280; text-decoration: underline;">Syarat & Ketentuan</a>
        </p>
      </div>
    </div>`;
}

export function wrapBaseTemplate(vars: BaseTemplateVars): string {
  const recipientLine = vars.recipientName
    ? `<p style="margin: 0 0 16px; color: #374151; font-size: 15px;">Halo, <strong style="color: #111827;">${vars.recipientName}</strong></p>`
    : "";

  const preheaderTag = vars.preheader
    ? `  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${vars.preheader}</div>\n`
    : "";

  return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${vars.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table { border-collapse: collapse; }
    td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: #F97316; }
     @media only screen and (max-width: 480px) {
       .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
       .email-body { padding: 24px 16px !important; }
       .cta-btn { padding: 14px 24px !important; font-size: 15px !important; display: block !important; }
       .footer-content { padding: 24px 16px !important; }
       h1 { font-size: 24px !important; }
     }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6;">
  ${preheaderTag}
  
  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6;">
  <tr><td align="center">
  <![endif]-->
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 24px 10px;">
        
        <!-- CONTAINER -->
        <table class="email-container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- HEADER -->
          <tr><td>${headerHTML()}</td></tr>
          
          <!-- BODY -->
          <tr>
            <td class="email-body" style="padding: 32px 28px;">
              ${recipientLine}
              
              <h1 style="margin: 0 0 8px; font-size: 26px; color: #111827; line-height: 1.3; font-weight: 800;">${vars.title}</h1>
              
              ${infoBarHTML(vars.orderId, vars.komplainId, vars.statusBadge)}
              
              <div style="color: #374151; font-size: 15px; line-height: 1.7;">
                ${vars.content}
              </div>
              
              ${infoRowsHTML(vars.infoRows)}
              
              ${ctaBlockHTML(vars.ctaUrl, vars.ctaLabel)}
              
              <!-- Alternative text link -->
              ${vars.ctaUrl ? `<div style="text-align: center; margin-top: -12px; margin-bottom: 8px;"><a href="${vars.ctaUrl}" target="_blank" style="color: #9CA3AF; font-size: 12px; text-decoration: underline;">${vars.ctaUrl}</a></div>` : ''}
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr><td>${footerHTML()}</td></tr>
          
        </table>
        
        <!-- DISCLAIMER -->
        <div style="max-width: 600px; margin: 12px auto 0; text-align: center; font-size: 11px; color: #9CA3AF; line-height: 1.5; padding: 0 16px;">
          Anda menerima email ini karena terdaftar sebagai pengguna ${APP_NAME}. Jika Anda merasa tidak seharusnya menerima email ini, silakan hubungi kami.
        </div>
        
      </td>
    </tr>
  </table>
  
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
  
</body>
</html>`;
}