import crypto from 'node:crypto'

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const paymentMethodSchema = z.object({
  type: z.enum(['MPESA', 'CARD', 'BANK']),
  label: z.string().trim().min(2).max(80),
  reference: z.string().trim().min(4).max(80),
  isDefault: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const methods = await getDb().paymentMethod.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return Response.json({
      paymentMethods: methods.map(method => ({
        id: method.id,
        type: method.type,
        label: method.label,
        provider: method.provider,
        lastFour: method.lastFour,
        isDefault: method.isDefault,
        createdAt: method.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const input = paymentMethodSchema.parse(await request.json())
    const db = getDb()
    const tokenReference = `SIM-PAY-${crypto.randomBytes(12).toString('hex')}`

    const method = await db.$transaction(async tx => {
      if (input.isDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId: session.userId },
          data: { isDefault: false },
        })
      }

      const created = await tx.paymentMethod.create({
        data: {
          userId: session.userId,
          type: input.type,
          label: input.label,
          tokenReference,
          lastFour: input.reference.slice(-4),
          isDefault: input.isDefault,
        },
      })

      await writeAudit(tx, {
        actorUserId: session.userId,
        action: 'payment_method.created',
        entityType: 'payment_method',
        entityId: created.id,
        metadata: { type: input.type, label: input.label },
      })

      return created
    })

    return Response.json({
      paymentMethod: {
        id: method.id,
        type: method.type,
        label: method.label,
        provider: method.provider,
        lastFour: method.lastFour,
        isDefault: method.isDefault,
        createdAt: method.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid payment method details' }, { status: 400 })
    }

    return jsonError(error)
  }
}
