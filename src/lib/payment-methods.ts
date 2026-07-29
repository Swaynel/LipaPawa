export const CHECKOUT_PAYMENT_METHODS = ["MPESA", "CARD", "BANK", "PAYSTACK"] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export const PAYSTACK_PAYMENT_METHOD = "PAYSTACK" as const;
