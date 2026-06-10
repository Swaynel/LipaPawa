import { NextRequest } from 'next/server'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const notifications = await getDb().notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })

    return Response.json({
      notifications: notifications.map(notification => ({
        id: notification.id,
        channel: notification.channel,
        status: notification.status,
        subject: notification.subject,
        message: notification.message,
        sentAt: notification.sentAt?.toISOString() ?? null,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      })),
      unreadCount: notifications.filter(notification => !notification.readAt).length,
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    await getDb().notification.updateMany({
      where: {
        userId: session.userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
