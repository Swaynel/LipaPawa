import { NextRequest } from 'next/server'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.role)
    const transaction = await getDb().transaction.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: session.userId }),
      },
      include: {
        user: true,
        meter: true,
        token: true,
      },
    })

    if (!transaction) throw new ApiError(404, 'Transaction not found')

    const lines = [
      'PowerPay Electricity Receipt',
      `Receipt ID: ${transaction.id}`,
      `Customer: ${transaction.user.firstName} ${transaction.user.lastName}`,
      `Email: ${transaction.user.email}`,
      `Meter: ${transaction.meter.nickname || transaction.meter.meterNumber}`,
      `Meter number: ${transaction.meter.meterNumber}`,
      `Amount: ${transaction.currency} ${(transaction.amountCents / 100).toLocaleString()}`,
      `Units: ${transaction.units} kWh`,
      `Payment method: ${transaction.paymentMethod}`,
      `Payment reference: ${transaction.paymentReference || 'N/A'}`,
      `Status: ${transaction.status}`,
      `Token status: ${transaction.token?.status || 'N/A'}`,
      `Date: ${transaction.createdAt.toLocaleString('en-KE')}`,
    ]
    const pdf = createSimplePdf(lines)

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${transaction.id}.pdf"`,
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}

function createSimplePdf(lines: string[]) {
  const escapedLines = lines.map(line => escapePdfText(line))
  const text = [
    'BT',
    '/F1 18 Tf',
    '72 760 Td',
    `(${escapedLines[0]}) Tj`,
    '/F1 11 Tf',
    ...escapedLines.slice(1).flatMap(line => ['0 -24 Td', `(${line}) Tj`]),
    'ET',
  ].join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream\nendobj\n`,
  ]
  let offset = '%PDF-1.4\n'.length
  const offsets = [0]
  let body = ''

  for (const object of objects) {
    offsets.push(offset)
    body += object
    offset += Buffer.byteLength(object)
  }

  const xrefOffset = offset
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(value => `${String(value).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n')

  return `%PDF-1.4\n${body}${xref}`
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
