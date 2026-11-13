declare global {
  interface Window {
    Cashfree?: (config: { mode: 'sandbox' | 'production' }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: '_self' | '_blank' | '_top' | '_modal';
      }) => Promise<{ error?: { message?: string }; redirect?: boolean; paymentDetails?: any }>;
    };
  }
}

export interface PaymentGatewayStatus {
  cashfreeConfigured: boolean;
  cashfreeEnv: 'sandbox' | 'production';
  phonepeConfigured: boolean;
  phonepeEnv: 'sandbox' | 'production';
  anyGatewayConfigured: boolean;
  serverEmailConfigured: boolean;
}

export class GatewayConfigError extends Error {
  code: string;
  constructor(message: string, code = 'GATEWAY_KEYS_MISSING') {
    super(message);
    this.name = 'GatewayConfigError';
    this.code = code;
  }
}

export async function fetchPaymentGatewayStatus(): Promise<PaymentGatewayStatus> {
  try {
    const res = await fetch('/api/payments/config-status');
    if (!res.ok) throw new Error('Could not fetch payment gateway status');
    return await res.json();
  } catch {
    return {
      cashfreeConfigured: false,
      cashfreeEnv: 'production',
      phonepeConfigured: false,
      phonepeEnv: 'production',
      anyGatewayConfigured: false,
      serverEmailConfigured: false,
    };
  }
}

export async function processRealGatewayPayment(params: {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingRef: string;
  gatewayPreference?: 'cashfree' | 'phonepe' | 'auto';
  pendingContext?: Record<string, any>;
}): Promise<{ paid: boolean; txnId: string; orderId: string; gateway: string; redirected?: boolean }> {
  const createRes = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      currency: 'INR',
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      bookingRef: params.bookingRef,
      gatewayPreference: params.gatewayPreference || 'auto',
      returnBaseUrl: window.location.origin,
    }),
  });

  const data = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !data?.ok) {
    if (createRes.status === 412 || data?.code === 'GATEWAY_KEYS_MISSING') {
      throw new GatewayConfigError(
        data?.message ||
          'Real Cashfree / PhonePe merchant keys are not configured yet in environment secrets.'
      );
    }
    throw new Error(data?.message || 'Unable to initiate real payment order.');
  }

  if (data.gateway === 'phonepe' && data.redirectUrl) {
    if (params.pendingContext) {
      sessionStorage.setItem(
        'ticketlife_pending_pg_txn',
        JSON.stringify({
          orderId: data.orderId,
          gateway: 'phonepe',
          context: params.pendingContext,
        })
      );
    }
    window.location.href = data.redirectUrl;
    return {
      paid: false,
      txnId: data.orderId,
      orderId: data.orderId,
      gateway: 'phonepe',
      redirected: true,
    };
  }

  if (data.gateway === 'cashfree' && data.paymentSessionId) {
    if (!window.Cashfree) {
      throw new Error(
        'Cashfree PG JS SDK is still loading or blocked. Please allow sdk.cashfree.com and retry.'
      );
    }

    if (params.pendingContext) {
      sessionStorage.setItem(
        'ticketlife_pending_pg_txn',
        JSON.stringify({
          orderId: data.orderId,
          gateway: 'cashfree',
          context: params.pendingContext,
        })
      );
    }

    const cashfree = window.Cashfree({
      mode: data.environment === 'sandbox' ? 'sandbox' : 'production',
    });

    const checkoutResult = await cashfree.checkout({
      paymentSessionId: data.paymentSessionId,
      redirectTarget: '_modal',
    });

    if (checkoutResult?.error) {
      throw new Error(checkoutResult.error.message || 'Payment cancelled or failed in Cashfree.');
    }

    // Verify real payment status directly from Cashfree server API
    const verifyRes = await verifyRealGatewayOrder(data.orderId, 'cashfree');
    if (!verifyRes.paid) {
      throw new Error(`Payment not completed (Status: ${verifyRes.status}).`);
    }

    sessionStorage.removeItem('ticketlife_pending_pg_txn');
    return {
      paid: true,
      txnId: verifyRes.txnId,
      orderId: verifyRes.orderId,
      gateway: 'cashfree',
    };
  }

  throw new Error('Unexpected response from payment gateway server.');
}

export async function verifyRealGatewayOrder(
  orderId: string,
  gateway: 'cashfree' | 'phonepe' = 'cashfree'
): Promise<{ paid: boolean; status: string; txnId: string; orderId: string }> {
  const res = await fetch('/api/payments/verify-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, gateway }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Unable to verify payment status.');
  }
  return {
    paid: Boolean(data.paid),
    status: String(data.status || 'UNKNOWN'),
    txnId: String(data.txnId || orderId),
    orderId: String(data.orderId || orderId),
  };
}
