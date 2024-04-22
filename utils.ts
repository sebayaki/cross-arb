export function toWei(amount: bigint): bigint {
  return amount * 10n ** 18n;
}

export function amountToString(amount: string, decimals = 4): string {
  return (Number(amount) / 1e18).toFixed(decimals);
}
