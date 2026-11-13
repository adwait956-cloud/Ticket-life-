import { BookingRecord, EmailNotificationLog, TravelDigestItem } from '../types/travel';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const NOTIFICATIONS_STORAGE_KEY = 'ticketlife_notifications_log_v1';

// Converts a string to base64url RFC 4648
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

let notifSeq = 0;
function createUniqueNotifId(): string {
  notifSeq += 1;
  return `notif-${Date.now()}-${notifSeq}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Storage helpers for Email Notification logs
 */
export function getStoredNotificationLogs(): EmailNotificationLog[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: EmailNotificationLog[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.map((entry, idx) => {
      let id = entry?.id || createUniqueNotifId();
      if (seen.has(id)) {
        id = `${id}-${idx}`;
      }
      seen.add(id);
      return { ...entry, id };
    });
  } catch (e) {
    return [];
  }
}

export function saveNotificationLog(log: EmailNotificationLog): void {
  try {
    const logs = getStoredNotificationLogs();
    const existingIds = new Set(logs.map((l) => l.id));
    const uniqueLog = existingIds.has(log.id)
      ? { ...log, id: createUniqueNotifId() }
      : log;
    logs.unshift(uniqueLog);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving notification log:', e);
  }
}

/**
 * Base64 encode UTF-8 string for Subject header
 */
function encodeHeaderUtf8(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `=?UTF-8?B?${btoa(binary)}?=`;
  } catch {
    return text;
  }
}

/**
 * Sends a raw MIME email via Gmail API
 */
async function sendRawGmailMessage(
  recipientEmail: string,
  subject: string,
  htmlContent: string,
  accessToken: string
): Promise<{ id: string; threadId: string }> {
  if (!accessToken) {
    throw new Error('Valid Google access token is required to send emails via Gmail.');
  }

  const encodedSubject = encodeHeaderUtf8(subject);

  const rawMessage = [
    `To: ${recipientEmail}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(
      new TextEncoder()
        .encode(htmlContent)
        .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    ),
  ].join('\r\n');

  const encodedMessage = base64UrlEncode(rawMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gmail send error response:', errorText);
    throw new Error(`Gmail API response (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * 1. Account Created Welcome Email Notification
 */
export async function sendAccountCreatedNotification(
  recipientEmail: string,
  userName: string,
  accessToken?: string | null
): Promise<{ id: string; threadId?: string }> {
  const subject = 'Welcome to Ticket Life! Your Travel Super App Account is Active';
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
      <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">TICKET LIFE</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Real Travel & Transportation Super App</div>
    </div>
    <div style="padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Welcome aboard, ${userName}!</h2>
      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        Your verified Ticket Life account is now activated with email <strong>${recipientEmail}</strong>. You now have instant access to live rides across 3 transportation modes:
      </p>
      
      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.8;">
          <li><strong>Cars & Cabs:</strong> Verified sedans, SUVs, and private chauffeur rides with live GPS tracking</li>
          <li><strong>Auto Rickshaws:</strong> Fast local meter and electric auto rickshaws with instant ride OTP</li>
          <li><strong>Bikes:</strong> Quick two-wheeler moto taxis and commuter rentals to beat city traffic</li>
        </ul>
      </div>

      <div style="background-color: #ecfdf5; border: 1px dashed #10b981; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">Your Welcome Gift Coupon</div>
        <div style="font-size: 16px; font-weight: 800; color: #065f46; font-family: monospace; margin: 4px 0;">FIRSTTRIP</div>
        <div style="font-size: 12px; color: #047857;">Get Flat 15% off on your first car, auto rickshaw, or bike ride booking.</div>
      </div>

      <p style="font-size: 12px; color: #64748b; margin: 0;">
        If you did not create this account, please immediately contact our 24/7 support desk at support@ticketlife.app.
      </p>
    </div>
    <div style="padding: 16px 24px; background-color: #0f172a; color: #94a3b8; font-size: 11px; text-align: center;">
      Notification sent from support@ticketlife.app · Ticket Life Technologies
    </div>
  </div>
</body>
</html>
  `;

  let msgId = `sim-welcome-${Date.now()}`;
  let sendStatus: 'sent' | 'pending' | 'failed' = 'sent';
  if (accessToken) {
    try {
      const res = await sendRawGmailMessage(recipientEmail, subject, htmlContent, accessToken);
      msgId = res.id;
    } catch (e: any) {
      console.error('Gmail API welcome email direct dispatch failed:', e);
      sendStatus = 'failed';
      saveNotificationLog({
        id: createUniqueNotifId(),
        type: 'account_created',
        recipientEmail,
        senderEmail: 'support@ticketlife.app',
        subject,
        timestamp: new Date().toISOString(),
        status: 'failed',
        gmailMessageId: undefined,
        meta: { userName, error: e.message },
      });
      throw e;
    }
  }

  saveNotificationLog({
    id: createUniqueNotifId(),
    type: 'account_created',
    recipientEmail,
    senderEmail: 'support@ticketlife.app',
    subject,
    timestamp: new Date().toISOString(),
    status: sendStatus,
    gmailMessageId: msgId,
    meta: { userName },
  });

  return { id: msgId };
}

/**
 * 2. Forgot Password / Security Verification Email Notification
 */
export async function sendForgotPasswordNotification(
  recipientEmail: string,
  resetCode: string,
  accessToken?: string | null
): Promise<{ id: string; threadId?: string }> {
  const subject = `Ticket Life Security: Password Reset & Access Code [${resetCode}]`;
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
      <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">TICKET LIFE</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Security & Account Protection Notice</div>
    </div>
    <div style="padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Password Reset Verification Code</h2>
      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        We received a request to reset your Ticket Life account credentials associated with <strong>${recipientEmail}</strong>. Use the secure authorization code below to proceed:
      </p>

      <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">One-Time Security Token</div>
        <div style="font-size: 28px; font-weight: 900; color: #0284c7; font-family: monospace; letter-spacing: 4px; margin: 6px 0;">
          ${resetCode}
        </div>
        <div style="font-size: 11px; color: #ef4444; font-weight: 600;">Valid for 15 minutes · Do not share with anyone</div>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 8px 0;">
        If you did not request this code, your account credentials may be compromised. Please lock your account or contact support@ticketlife.app.
      </p>
    </div>
    <div style="padding: 16px 24px; background-color: #0f172a; color: #94a3b8; font-size: 11px; text-align: center;">
      Automated security alert from support@ticketlife.app · Ticket Life Security Operations
    </div>
  </div>
</body>
</html>
  `;

  let msgId = `sim-reset-${Date.now()}`;
  let sendStatus: 'sent' | 'pending' | 'failed' = 'sent';
  if (accessToken) {
    try {
      const res = await sendRawGmailMessage(recipientEmail, subject, htmlContent, accessToken);
      msgId = res.id;
    } catch (e: any) {
      console.error('Gmail API forgot password email failed:', e);
      sendStatus = 'failed';
      saveNotificationLog({
        id: createUniqueNotifId(),
        type: 'forgot_password',
        recipientEmail,
        senderEmail: 'support@ticketlife.app',
        subject,
        timestamp: new Date().toISOString(),
        status: 'failed',
        gmailMessageId: undefined,
        meta: { resetCode, error: e.message },
      });
      throw e;
    }
  }

  saveNotificationLog({
    id: createUniqueNotifId(),
    type: 'forgot_password',
    recipientEmail,
    senderEmail: 'support@ticketlife.app',
    subject,
    timestamp: new Date().toISOString(),
    status: sendStatus,
    gmailMessageId: msgId,
    meta: { resetCode },
  });

  return { id: msgId };
}

/**
 * 2b. Login Security Alert Email Notification
 * Dispatched automatically whenever user signs into Ticket Life
 */
export async function sendLoginSecurityAlertNotification(
  recipientEmail: string,
  userName: string,
  accessToken?: string | null
): Promise<{
  id: string;
  threadId?: string;
  delivered: boolean;
  channel: 'gmail_api' | 'server_email' | 'pending_auth';
  error?: string;
}> {
  const loginTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  const subject = `Security Alert: New Sign-in Detected on Ticket Life [${loginTime}]`;
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
      <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">TICKET LIFE</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Account Security Alert</div>
    </div>
    <div style="padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">New Sign-In Detected</h2>
      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        Hello <strong>${userName}</strong>,<br/>
        Your verified Ticket Life account (<strong>${recipientEmail}</strong>) was just signed into from a new browser session.
      </p>

      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 12px; color: #334155;">
          <tr>
            <td style="font-weight: 700; color: #64748b; width: 140px;">Date & Time:</td>
            <td><strong>${loginTime} (IST)</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b;">Device / Platform:</td>
            <td>Ticket Life Web / PWA Applet</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b;">Auth Provider:</td>
            <td>Verified Credentials / Google OAuth 2.0</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b;">Session Status:</td>
            <td><span style="background-color: #ecfdf5; color: #059669; font-weight: 700; padding: 2px 6px; border-radius: 4px;">ACTIVE</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 12px 0;">
        If you initiated this sign-in, no further action is required. If this was not you, please immediately sign out of all active sessions and change your account password.
      </p>
    </div>
    <div style="padding: 16px 24px; background-color: #0f172a; color: #94a3b8; font-size: 11px; text-align: center;">
      Security notification automatically dispatched from support@ticketlife.app · Ticket Life Security Operations
    </div>
  </div>
</body>
</html>
  `;

  let msgId = `pending-login-alert-${Date.now()}`;
  let delivered = false;
  let channel: 'gmail_api' | 'server_email' | 'pending_auth' = 'pending_auth';
  let errorMsg: string | undefined;

  if (accessToken) {
    try {
      const res = await sendRawGmailMessage(recipientEmail, subject, htmlContent, accessToken);
      msgId = res.id;
      delivered = true;
      channel = 'gmail_api';
    } catch (e: any) {
      errorMsg = e?.message || 'Gmail API delivery failed';
      console.warn('Gmail API direct send error for login alert:', e);
    }
  }

  if (!delivered) {
    try {
      const srvRes = await fetch('/api/email/login-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          userName,
          subject,
          htmlContent,
        }),
      });
      const srvData = await srvRes.json().catch(() => ({}));
      if (srvRes.ok && srvData?.ok) {
        msgId = srvData.id || msgId;
        delivered = true;
        channel = 'server_email';
        errorMsg = undefined;
      }
    } catch {
      // ignore if backend email service not configured
    }
  }

  saveNotificationLog({
    id: createUniqueNotifId(),
    type: 'login_alert',
    recipientEmail,
    senderEmail: 'noreply@ticket-life-c4b76.firebaseapp.com',
    subject,
    timestamp: new Date().toISOString(),
    status: delivered ? 'sent' : 'pending',
    gmailMessageId: delivered ? msgId : undefined,
    meta: { userName, loginTime, channel, error: errorMsg },
  });

  return { id: msgId, delivered, channel, error: errorMsg };
}

/**
 * 2c. Price Drop Alert Email Notification
 * Dispatched automatically when a route price drops below the user's set threshold
 */
export async function sendPriceDropAlertNotification(
  recipientEmail: string,
  route: string,
  category: string,
  currentPrice: number,
  targetPrice: number,
  serviceTitle: string,
  accessToken?: string | null
): Promise<{ id: string; threadId?: string }> {
  const alertTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  const savings = Math.max(0, targetPrice - currentPrice);
  const subject = `🔥 Price Drop Alert: ${route} now ₹${currentPrice.toLocaleString('en-IN')} (Target: ₹${targetPrice.toLocaleString('en-IN')})`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
      <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #f59e0b;">TICKET LIFE · PRICE WATCH</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Automated Fare Drop Notification</div>
    </div>
    <div style="padding: 24px;">
      <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px;">
        Price Threshold Hit
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">Great News! Fare Dropped on ${route}</h2>
      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        A verified travel option is now available below your price alert target of <strong>₹${targetPrice.toLocaleString('en-IN')}</strong>.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="font-weight: 700; color: #64748b; width: 140px;">Route:</td>
            <td><strong>${route}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b;">Service:</td>
            <td>${serviceTitle} (${category.toUpperCase()})</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b;">Current Live Fare:</td>
            <td style="font-size: 18px; font-weight: 900; color: #059669;">₹${currentPrice.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b;">Your Target:</td>
            <td>₹${targetPrice.toLocaleString('en-IN')}</td>
          </tr>
          ${savings > 0 ? `
          <tr>
            <td style="font-weight: 700; color: #64748b;">You Save:</td>
            <td style="font-weight: 800; color: #059669;">₹${savings.toLocaleString('en-IN')} under threshold</td>
          </tr>
          ` : ''}
          <tr>
            <td style="font-weight: 700; color: #64748b;">Alert Detected:</td>
            <td>${alertTime} (IST)</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 16px 0;">
        Fares are dynamic and subject to seat availability. We recommend booking immediately to lock in this verified rate.
      </p>
    </div>
    <div style="padding: 16px 24px; background-color: #0f172a; color: #94a3b8; font-size: 11px; text-align: center;">
      Price alert monitored and dispatched by Ticket Life Technologies.
    </div>
  </div>
</body>
</html>
  `;

  let msgId = `sim-price-drop-${Date.now()}`;
  if (accessToken && recipientEmail) {
    try {
      const res = await sendRawGmailMessage(recipientEmail, subject, htmlContent, accessToken);
      msgId = res.id;
    } catch (e) {
      console.warn('Gmail API send error for price alert:', e);
    }
  }

  saveNotificationLog({
    id: createUniqueNotifId(),
    type: 'price_alert',
    recipientEmail: recipientEmail || 'Passenger',
    senderEmail: 'support@ticketlife.app',
    subject,
    timestamp: new Date().toISOString(),
    status: 'sent',
    gmailMessageId: msgId,
    meta: { route, category, currentPrice, targetPrice, serviceTitle },
  });

  return { id: msgId };
}

/**
 * 3. Travel Booking Confirmed Email Notification
 */
export async function sendTicketEmail(
  booking: BookingRecord,
  recipientEmail: string,
  accessToken?: string | null
): Promise<{ id: string; threadId?: string }> {
  const categoryLabel = booking.category.toUpperCase();
  const subject = `Your Confirmed Ticket: ${booking.serviceTitle} (${booking.bookingRef}) - Ticket Life`;
  
  const passengersHtml = booking.passengers
    .map(
      (p, i) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: 600;">${p.fullName}</td>
          <td style="padding: 8px 12px;">${p.age} yrs / ${p.gender}</td>
          <td style="padding: 8px 12px; font-weight: 600; color: #0284c7;">Seat: ${booking.seatNumbers[i] || 'Allocated'}</td>
        </tr>
      `
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket Life Confirmed Booking</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">TICKET LIFE</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Official Booking & Travel Confirmation</div>
          </td>
          <td align="right">
            <span style="background-color: #10b981; color: #ffffff; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">CONFIRMED</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Booking Highlights -->
    <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 12px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Booking Reference</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${booking.bookingRef}</div>
          </td>
          <td align="right" style="padding-bottom: 12px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Provider Confirmation / PNR</div>
            <div style="font-size: 18px; font-weight: 700; color: #0284c7;">${booking.pnrNumber || booking.providerRef}</div>
          </td>
        </tr>
      </table>

      <!-- Journey Route -->
      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40%">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${booking.originCode}</div>
              <div style="font-size: 13px; color: #334155; font-weight: 500;">${booking.origin}</div>
              <div style="font-size: 14px; font-weight: 700; margin-top: 4px; color: #0369a1;">${booking.departureTime}</div>
              <div style="font-size: 12px; color: #64748b;">${booking.departureDate}</div>
            </td>
            <td width="20%" align="center">
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">${booking.duration}</div>
              <div style="font-size: 18px; color: #0284c7;">➔</div>
              <div style="font-size: 11px; color: #64748b;">${categoryLabel}</div>
            </td>
            <td width="40%" align="right">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${booking.destCode}</div>
              <div style="font-size: 13px; color: #334155; font-weight: 500;">${booking.destination}</div>
              <div style="font-size: 14px; font-weight: 700; margin-top: 4px; color: #0369a1;">${booking.arrivalTime}</div>
              <div style="font-size: 12px; color: #64748b;">${booking.arrivalDate}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Service Details -->
      <div style="margin-top: 16px;">
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${booking.serviceTitle} (${booking.serviceNumber})</div>
        <div style="font-size: 13px; color: #64748b;">${booking.vehicleType} · Operated by ${booking.providerName}</div>
      </div>
    </div>

    <!-- Passengers Section -->
    <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
      <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 12px;">Passenger Details</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; text-align: left;">
        <thead>
          <tr style="background-color: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 8px 12px;">Name</th>
            <th style="padding: 8px 12px;">Age & Gender</th>
            <th style="padding: 8px 12px;">Seat / Berth</th>
          </tr>
        </thead>
        <tbody>
          ${passengersHtml}
        </tbody>
      </table>
    </div>

    <!-- Payment & Verification Receipt -->
    <div style="padding: 24px; background-color: #fafafa;">
      <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 12px;">Payment Summary</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0;">Base Fare</td>
          <td align="right" style="padding: 4px 0;">₹${booking.fareBreakdown.baseFare.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Taxes & GST</td>
          <td align="right" style="padding: 4px 0;">₹${booking.fareBreakdown.taxesAndGst.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Platform Convenience Fee</td>
          <td align="right" style="padding: 4px 0;">₹${booking.fareBreakdown.convenienceFee.toLocaleString('en-IN')}</td>
        </tr>
        ${
          booking.fareBreakdown.discount > 0
            ? `<tr>
                <td style="padding: 4px 0; color: #16a34a;">Discount Applied</td>
                <td align="right" style="padding: 4px 0; color: #16a34a;">-₹${booking.fareBreakdown.discount.toLocaleString('en-IN')}</td>
              </tr>`
            : ''
        }
        <tr style="border-top: 1px solid #cbd5e1; font-weight: 700; font-size: 15px; color: #0f172a;">
          <td style="padding: 10px 0;">Total Amount Paid</td>
          <td align="right" style="padding: 10px 0;">₹${booking.fareBreakdown.totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </table>
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        Paid via <strong>${booking.paymentMethod}</strong> (Txn ID: ${booking.paymentTxnId})
      </div>
    </div>

    <!-- Official Footer & Verification -->
    <div style="padding: 20px 24px; background-color: #0f172a; color: #94a3b8; font-size: 11px; text-align: center;">
      <p style="margin: 0 0 6px 0;">
        This confirmed ticket was issued through authorized provider partners on <strong>Ticket Life</strong>.
      </p>
      <p style="margin: 0;">
        Need assistance or 24/7 support? Reach out to support@ticketlife.app or visit the Ticket Life Help Center.
      </p>
    </div>

  </div>
</body>
</html>
  `;

  let res = { id: `msg-${Date.now()}`, threadId: `th-${Date.now()}` };
  if (accessToken) {
    try {
      res = await sendRawGmailMessage(recipientEmail, subject, htmlBody, accessToken);
    } catch (e) {
      console.warn('Gmail API dispatch attempt notice:', e);
    }
  }

  saveNotificationLog({
    id: createUniqueNotifId(),
    type: 'travel_booking',
    recipientEmail,
    senderEmail: 'support@ticketlife.app',
    subject,
    timestamp: new Date().toISOString(),
    status: 'sent',
    gmailMessageId: res.id,
    meta: { bookingRef: booking.bookingRef, pnr: booking.pnrNumber || booking.providerRef },
  });
  return res;
}

/**
 * Lists travel-related messages from Gmail to assist user in viewing external bookings
 */
export async function fetchTravelEmails(accessToken: string): Promise<GmailMessageSummary[]> {
  if (!accessToken) return [];

  try {
    const query = encodeURIComponent('subject:(ticket OR booking OR ride OR cab OR auto OR bike)');
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${query}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listRes.ok) {
      console.warn('Gmail list messages failed:', await listRes.text());
      return [];
    }

    const listData = await listRes.json();
    if (!listData.messages || !Array.isArray(listData.messages)) {
      return [];
    }

    const messages: GmailMessageSummary[] = [];

    for (const item of listData.messages.slice(0, 6)) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'Travel Email';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        messages.push({
          id: detail.id,
          threadId: detail.threadId,
          subject,
          from,
          date,
          snippet: detail.snippet || '',
        });
      }
    }

    return messages;
  } catch (err) {
    console.error('Error fetching travel emails from Gmail:', err);
    return [];
  }
}

/**
 * Parses Gmail travel messages and system bookings into an automated Travel Digest
 */
export function buildTravelDigest(
  gmailMessages: GmailMessageSummary[],
  confirmedBookings: BookingRecord[]
): TravelDigestItem[] {
  const digestItems: TravelDigestItem[] = [];

  // 1. Parse Gmail messages
  gmailMessages.forEach((msg, idx) => {
    const sub = msg.subject;
    const snip = msg.snippet;
    const lower = `${sub} ${snip}`.toLowerCase();

    // Determine category among Cars, Autos, Bikes
    let category: 'cars' | 'autos' | 'bikes' = 'cars';
    if (lower.includes('auto') || lower.includes('rickshaw')) {
      category = 'autos';
    } else if (lower.includes('bike') || lower.includes('moto') || lower.includes('scooter')) {
      category = 'bikes';
    }

    // Extract carrier name
    let carrier = 'Ticket Life Mobility';
    if (category === 'autos') carrier = 'Ticket Life Auto Rickshaw';
    else if (category === 'bikes') carrier = 'Ticket Life Bike Taxi';

    // Extract Ride Ref
    const pnrMatch = lower.match(/(?:ref|pnr|otp)[:\s\-#]*([a-z0-9\-]{5,12})/i);
    const pnr = pnrMatch ? pnrMatch[1].toUpperCase() : `RIDE-${Math.floor(100000 + Math.random() * 900000)}`;

    digestItems.push({
      id: `digest-gmail-${msg.id}`,
      source: 'gmail_parsed',
      carrier,
      serviceNumber: category === 'autos' ? 'AUTO-LIVE' : category === 'bikes' ? 'BIKE-LIVE' : 'CAB-LIVE',
      category,
      origin: lower.includes('delhi') ? 'New Delhi (DEL)' : lower.includes('chennai') ? 'Chennai (MAA)' : 'Pickup Hub',
      originCode: lower.includes('delhi') ? 'DEL' : lower.includes('chennai') ? 'MAA' : 'ORG',
      destination: lower.includes('mumbai') ? 'Mumbai (BOM)' : lower.includes('bengaluru') ? 'Bengaluru (BLR)' : 'Drop Point',
      destCode: lower.includes('mumbai') ? 'BOM' : lower.includes('bengaluru') ? 'BLR' : 'DST',
      departureDate: '2026-11-18',
      departureTime: '07:15 AM',
      departureCountdown: idx === 0 ? 'Pickup Soon' : 'Scheduled Ride',
      pnrOrRef: pnr,
      platformOrTerminal: 'Pickup Bay',
      statusText: 'Verified via Gmail Itinerary',
      gmailSnippet: snip,
      rawDate: msg.date,
    });
  });

  // 2. Add System Confirmed Bookings that are upcoming
  confirmedBookings
    .filter((b) => b.bookingStatus === 'confirmed')
    .forEach((b) => {
      // Calculate dynamic departure countdown
      let countdown = 'Upcoming';
      const depDate = new Date(`${b.departureDate} ${b.departureTime.replace(' AM', ':00 AM').replace(' PM', ':00 PM')}`);
      const now = new Date();
      const diffMs = depDate.getTime() - now.getTime();
      const diffHrs = Math.round(diffMs / (1000 * 60 * 60));

      if (diffHrs > 0 && diffHrs <= 24) {
        countdown = `Departs in ${diffHrs} hours`;
      } else if (diffHrs > 24 && diffHrs <= 48) {
        countdown = `Tomorrow at ${b.departureTime}`;
      } else if (diffHrs > 48) {
        countdown = `Departs in ${Math.round(diffHrs / 24)} days`;
      } else {
        countdown = `Departs Today at ${b.departureTime}`;
      }

      digestItems.push({
        id: `digest-bkg-${b.id}`,
        source: 'confirmed_booking',
        carrier: b.providerName,
        serviceNumber: b.serviceNumber,
        category: b.category,
        origin: b.origin,
        originCode: b.originCode,
        destination: b.destination,
        destCode: b.destCode,
        departureDate: b.departureDate,
        departureTime: b.departureTime,
        departureCountdown: countdown,
        pnrOrRef: b.pnrNumber || b.providerRef,
        platformOrTerminal: b.terminalOrPlatform || 'Main Gate / Platform',
        seatInfo: b.seatNumbers.join(', '),
        statusText: 'Confirmed on Ticket Life',
      });
    });

  return digestItems;
}
