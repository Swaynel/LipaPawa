export function formatKesFromCents(amountCents: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function formatUnits(units: number) {
  return `${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(units)} kWh`;
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function statusTone(status: string) {
  if (["COMPLETED", "APPLIED", "ACTIVE", "SENT"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (["PENDING", "GENERATED", "TRANSMITTED"].includes(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (["SUSPENDED", "FAILED", "REVERSED"].includes(status)) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}
