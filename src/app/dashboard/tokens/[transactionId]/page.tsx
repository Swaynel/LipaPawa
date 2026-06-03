import TokenDetails from './token-details'

export default async function TokenPage({
  params,
}: {
  params: Promise<{ transactionId: string }>
}) {
  const { transactionId } = await params

  return <TokenDetails transactionId={transactionId} />
}
