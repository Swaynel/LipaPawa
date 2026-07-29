import { NextRequest } from 'next/server'

import { finalizePaystackPurchase } from '@/services/purchase-service'

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin
  const url = new URL(request.url)
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref')

  if (!reference) {
    return Response.redirect(
      new URL('/dashboard/purchase?payment=cancelled', appUrl).toString(),
      303,
    )
  }

  try {
    const transaction = await finalizePaystackPurchase(reference)

    if (transaction.token) {
      return Response.redirect(
        new URL(`/dashboard/tokens/${transaction.id}`, appUrl).toString(),
        303,
      )
    }

    return Response.redirect(
      new URL('/dashboard/purchase?payment=failed', appUrl).toString(),
      303,
    )
  } catch {
    return Response.redirect(
      new URL('/dashboard/purchase?payment=failed', appUrl).toString(),
      303,
    )
  }
}
