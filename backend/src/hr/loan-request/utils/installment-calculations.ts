// Splits totalAmount evenly across totalInstallments; the last installment absorbs
// any rounding remainder so every cent of totalAmount is accounted for.
export function splitAmountIntoInstallments(
  totalAmount: number,
  totalInstallments: number,
): number[] {
  const baseAmount = Math.floor((totalAmount / totalInstallments) * 100) / 100;
  const amounts = new Array(totalInstallments - 1).fill(baseAmount);

  const amountSoFar = baseAmount * (totalInstallments - 1);
  const lastInstallmentAmount = Math.round((totalAmount - amountSoFar) * 100) / 100;

  return [...amounts, lastInstallmentAmount];
}
