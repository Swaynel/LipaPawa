import crypto from "node:crypto";

const PAYSTACK_API_BASE = "https://api.paystack.co";

type PaystackApiResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

type PaystackInitializationData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type PaystackVerificationData = {
  status: string;
  reference: string;
  amount: number;
  gateway_response?: string | null;
  message?: string | null;
  paid_at?: string | null;
};

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  return secretKey;
}

export function createPaystackReference() {
  return `psk-${crypto.randomUUID()}`;
}

export async function initializePaystackTransaction(input: {
  amountCents: number;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountCents,
      email: input.email,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "KES",
      channels: ["card"],
      ...(input.metadata ? { metadata: JSON.stringify(input.metadata) } : {}),
    }),
  });

  const payload = (await response.json()) as PaystackApiResponse<PaystackInitializationData>;

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Failed to initialize Paystack payment");
  }

  return payload.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(
    `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
      },
    },
  );

  const payload = (await response.json()) as PaystackApiResponse<PaystackVerificationData>;

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Failed to verify Paystack payment");
  }

  return payload.data;
}
