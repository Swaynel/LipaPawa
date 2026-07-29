import crypto from 'node:crypto'

import { NextRequest } from 'next/server'

import { jsonError } from '@/lib/api-auth'
import { finalizePaystackPurchase } from '@/services/purchase-service'

type PaystackWebhookEvent = {
  event?: string
  data?: {
    reference?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured')
    }

    const signature = request.headers.get('x-paystack-signature')
    const body = await request.text()
    const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex')

    if (!signature || signature !== hash) {
      return new Response('Invalid signature', { status: 401 })
    }

    let event: PaystackWebhookEvent
    try {
      event = JSON.parse(body) as PaystackWebhookEvent
    } catch {
      return new Response('Invalid payload', { status: 400 })
    }

    if (event.event !== 'charge.success') {
      return new Response(null, { status: 200 })
    }

    const reference = event.data?.reference
    if (!reference) {
      return new Response(null, { status: 200 })
    }

    await finalizePaystackPurchase(reference)

    return new Response(null, { status: 200 })
  } catch (error) {
    return jsonError(error)
  }
}
