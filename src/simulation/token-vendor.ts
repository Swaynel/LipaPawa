import crypto from "node:crypto";

export function generateSimulatedToken(input: {
  transactionId: string;
  meterNumber: string;
  units: number;
}) {
  const seed = `${input.transactionId}:${input.meterNumber}:${input.units}`;
  const hash = crypto.createHash("sha256").update(seed).digest();
  let digits = "";

  for (const byte of hash) {
    digits += (byte % 10).toString();
    if (digits.length === 20) break;
  }

  const padded = digits.padEnd(20, "0");
  return padded.match(/.{1,4}/g)?.join("-") ?? padded;
}
