import TokenDetails from '@/app/dashboard/tokens/[transactionId]/token-details'

export default async function TokenModalPage({
  params,
}: {
  params: Promise<{ transactionId: string }>
}) {
  const { transactionId } = await params

  return <TokenDetails transactionId={transactionId} variant="modal" />
}
