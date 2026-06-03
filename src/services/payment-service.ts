export async function simulatePayment(input: {
  amountCents: number;
  paymentMethod: string;
}) {
  await new Promise((resolve) => setTimeout(resolve, 120));

  if (input.amountCents <= 0) {
    return {
      success: false,
      reference: null,
      failureReason: "Invalid payment amount",
    };
  }

  return {
    success: true,
    reference: `SIM-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`,
    failureReason: null,
  };
}
