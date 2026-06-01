export function computeOrderOutstanding(
  offerTotal: number,
  payments: { amount: number }[],
): { paidTotal: number; outstandingTotal: number } {
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0)
  const outstandingTotal = Math.max(0, offerTotal - paidTotal)
  return { paidTotal, outstandingTotal }
}
