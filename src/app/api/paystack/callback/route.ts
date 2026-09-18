import { NextRequest } from 'next/server'

import { getAppUrl } from '@/lib/app-url'
import { finalizePaystackPurchase } from '@/services/purchase-service'

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request)
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

    if (transaction.status === 'PENDING') {
      return Response.redirect(
        new URL(`/dashboard/purchase?payment=pending&reference=${encodeURIComponent(reference)}`, appUrl).toString(),
        303,
      )
    }

    return Response.redirect(
      new URL('/dashboard/purchase?payment=failed', appUrl).toString(),
      303,
    )
  } catch (error) {
    console.error('Paystack callback finalization failed', error)
    return Response.redirect(
      new URL('/dashboard/purchase?payment=failed', appUrl).toString(),
      303,
    )
  }
}
