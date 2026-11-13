import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getCashfreeConfig() {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const env = (process.env.CASHFREE_ENV || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  const baseUrl =
    env === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
  return {
    configured: Boolean(appId && secretKey),
    appId,
    secretKey,
    env,
    baseUrl,
  };
}

function getPhonePeConfig() {
  const merchantId = (process.env.PHONEPE_MERCHANT_ID || '').trim();
  const saltKey = (process.env.PHONEPE_SALT_KEY || '').trim();
  const saltIndex = (process.env.PHONEPE_SALT_INDEX || '1').trim();
  const env = (process.env.PHONEPE_ENV || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  const baseUrl =
    env === 'sandbox'
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
      : 'https://api.phonepe.com/apis/hermes';
  return {
    configured: Boolean(merchantId && saltKey),
    merchantId,
    saltKey,
    saltIndex,
    env,
    baseUrl,
  };
}

function getEmailConfig() {
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  return {
    resendConfigured: Boolean(resendKey),
    smtpConfigured: Boolean(smtpUser && smtpPass),
    configured: Boolean(resendKey || (smtpUser && smtpPass)),
    resendKey,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'ticket-life-api' });
  });

  app.get('/api/maps/key', (_req: Request, res: Response) => {
    const key = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
    res.json({ configured: Boolean(key), key });
  });

  app.get('/api/payments/config-status', (_req: Request, res: Response) => {
    const cf = getCashfreeConfig();
    const pp = getPhonePeConfig();
    const email = getEmailConfig();
    res.json({
      cashfreeConfigured: cf.configured,
      cashfreeEnv: cf.env,
      phonepeConfigured: pp.configured,
      phonepeEnv: pp.env,
      anyGatewayConfigured: cf.configured || pp.configured,
      serverEmailConfigured: email.configured,
    });
  });

  app.post('/api/payments/create-order', async (req: Request, res: Response) => {
    try {
      const {
        amount,
        currency = 'INR',
        customerName = 'Ticket Life Passenger',
        customerEmail = 'passenger@ticketlife.app',
        customerPhone = '9999999999',
        bookingRef = `TL-${Date.now()}`,
        gatewayPreference = 'auto',
        returnBaseUrl,
      } = req.body || {};

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 1) {
        return res.status(400).json({ ok: false, message: 'Invalid payment amount.' });
      }

      const cf = getCashfreeConfig();
      const pp = getPhonePeConfig();
      const sanitizedPhone = String(customerPhone).replace(/\D/g, '').slice(-10) || '9999999999';
      const orderId = `TL_ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const originBase =
        typeof returnBaseUrl === 'string' && returnBaseUrl.startsWith('http')
          ? returnBaseUrl.replace(/\/$/, '')
          : process.env.APP_URL || `http://localhost:${PORT}`;

      if ((gatewayPreference === 'cashfree' || gatewayPreference === 'auto') && cf.configured) {
        const cfPayload = {
          order_id: orderId,
          order_amount: Number(numericAmount.toFixed(2)),
          order_currency: currency,
          customer_details: {
            customer_id: `cust_${sanitizedPhone}`,
            customer_name: String(customerName).slice(0, 60),
            customer_email: String(customerEmail).trim(),
            customer_phone: sanitizedPhone,
          },
          order_meta: {
            return_url: `${originBase}/?cf_order_id={order_id}`,
          },
          order_note: `Ticket Life Booking ${bookingRef}`,
        };

        const cfRes = await fetch(`${cf.baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': cf.appId,
            'x-client-secret': cf.secretKey,
            'x-api-version': '2023-08-01',
          },
          body: JSON.stringify(cfPayload),
        });

        const cfData: any = await cfRes.json();
        if (!cfRes.ok || !cfData.payment_session_id) {
          return res.status(cfRes.status || 502).json({
            ok: false,
            gateway: 'cashfree',
            message: cfData?.message || 'Cashfree order creation failed.',
          });
        }

        return res.json({
          ok: true,
          gateway: 'cashfree',
          environment: cf.env,
          orderId: cfData.order_id,
          paymentSessionId: cfData.payment_session_id,
        });
      }

      if ((gatewayPreference === 'phonepe' || gatewayPreference === 'auto') && pp.configured) {
        const amountPaise = Math.round(numericAmount * 100);
        const merchantTransactionId = `TL_PP_${Date.now()}`;
        const ppPayload = {
          merchantId: pp.merchantId,
          merchantTransactionId,
          merchantUserId: `MUID_${sanitizedPhone}`,
          amount: amountPaise,
          redirectUrl: `${originBase}/?pp_txn_id=${merchantTransactionId}`,
          redirectMode: 'REDIRECT',
          mobileNumber: sanitizedPhone,
          paymentInstrument: {
            type: 'PAY_PAGE',
          },
        };

        const base64Payload = Buffer.from(JSON.stringify(ppPayload), 'utf8').toString('base64');
        const sha256Hex = crypto
          .createHash('sha256')
          .update(`${base64Payload}/pg/v1/pay${pp.saltKey}`)
          .digest('hex');
        const xVerify = `${sha256Hex}###${pp.saltIndex}`;

        const ppRes = await fetch(`${pp.baseUrl}/pg/v1/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
          },
          body: JSON.stringify({ request: base64Payload }),
        });

        const ppData: any = await ppRes.json();
        const redirectUrl = ppData?.data?.instrumentResponse?.redirectInfo?.url;
        if (!ppRes.ok || !ppData?.success || !redirectUrl) {
          return res.status(ppRes.status || 502).json({
            ok: false,
            gateway: 'phonepe',
            message: ppData?.message || 'PhonePe payment initiation failed.',
          });
        }

        return res.json({
          ok: true,
          gateway: 'phonepe',
          environment: pp.env,
          orderId: merchantTransactionId,
          redirectUrl,
        });
      }

      return res.status(412).json({
        ok: false,
        configured: false,
        code: 'GATEWAY_KEYS_MISSING',
        message:
          'Real Payment Gateway credentials (CASHFREE_APP_ID & CASHFREE_SECRET_KEY, or PHONEPE_MERCHANT_ID & PHONEPE_SALT_KEY) are not configured in environment secrets yet. Complete Cashfree / PhonePe Merchant KYC with your own Income Tax PAN card and bank account, then add the live API keys in Secrets.',
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: err?.message || 'Payment server error.',
      });
    }
  });

  app.post('/api/payments/verify-order', async (req: Request, res: Response) => {
    try {
      const { orderId, gateway = 'cashfree' } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ ok: false, message: 'Missing orderId.' });
      }

      if (gateway === 'cashfree') {
        const cf = getCashfreeConfig();
        if (!cf.configured) {
          return res.status(412).json({ ok: false, message: 'Cashfree credentials not configured.' });
        }

        const verifyRes = await fetch(`${cf.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: {
            'x-client-id': cf.appId,
            'x-client-secret': cf.secretKey,
            'x-api-version': '2023-08-01',
          },
        });
        const data: any = await verifyRes.json();
        const paid = data?.order_status === 'PAID';
        return res.json({
          ok: verifyRes.ok,
          paid,
          status: data?.order_status || 'UNKNOWN',
          orderId: data?.order_id || orderId,
          txnId: data?.cf_order_id ? `cf_${data.cf_order_id}` : orderId,
        });
      }

      if (gateway === 'phonepe') {
        const pp = getPhonePeConfig();
        if (!pp.configured) {
          return res.status(412).json({ ok: false, message: 'PhonePe credentials not configured.' });
        }
        const statusPath = `/pg/v1/status/${pp.merchantId}/${encodeURIComponent(orderId)}`;
        const sha256Hex = crypto
          .createHash('sha256')
          .update(`${statusPath}${pp.saltKey}`)
          .digest('hex');
        const xVerify = `${sha256Hex}###${pp.saltIndex}`;

        const verifyRes = await fetch(`${pp.baseUrl}${statusPath}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
            'X-MERCHANT-ID': pp.merchantId,
          },
        });
        const data: any = await verifyRes.json();
        const paid = Boolean(data?.success && data?.code === 'PAYMENT_SUCCESS');
        return res.json({
          ok: verifyRes.ok,
          paid,
          status: data?.code || 'UNKNOWN',
          orderId,
          txnId: data?.data?.transactionId || orderId,
        });
      }

      return res.status(400).json({ ok: false, message: 'Unsupported gateway.' });
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: err?.message || 'Verification failed.' });
    }
  });

  app.post('/api/email/login-alert', async (req: Request, res: Response) => {
    try {
      const { recipientEmail, userName, subject, htmlContent } = req.body || {};
      if (!recipientEmail || !subject || !htmlContent) {
        return res.status(400).json({ ok: false, message: 'Missing email parameters.' });
      }

      const emailCfg = getEmailConfig();
      if (!emailCfg.configured) {
        return res.status(412).json({
          ok: false,
          configured: false,
          message: 'Server SMTP / Resend email not configured; client Gmail OAuth can deliver directly.',
        });
      }

      if (emailCfg.resendConfigured) {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${emailCfg.resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Ticket Life <onboarding@resend.dev>',
            to: [recipientEmail],
            subject,
            html: htmlContent,
          }),
        });
        const resendData: any = await resendRes.json();
        if (!resendRes.ok) {
          return res.status(502).json({ ok: false, message: resendData?.message || 'Resend API failed.' });
        }
        return res.json({ ok: true, id: resendData.id, channel: 'resend' });
      }

      const transporter = nodemailer.createTransport({
        host: emailCfg.smtpHost,
        port: emailCfg.smtpPort,
        secure: emailCfg.smtpPort === 465,
        auth: {
          user: emailCfg.smtpUser,
          pass: emailCfg.smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"Ticket Life Security" <${emailCfg.smtpUser}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: `Hello ${userName || 'Passenger'}, a new sign-in was detected on your Ticket Life account (${recipientEmail}).`,
      });

      return res.json({ ok: true, id: info.messageId, channel: 'smtp' });
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: err?.message || 'Failed to dispatch server email.' });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ticket Life server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
