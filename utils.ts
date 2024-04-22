export function toWei(amount: bigint): bigint {
  return amount * 10n ** 18n;
}

export function toReadable(amount: bigint, decimals = 8): string {
  return (Number(amount) / 1e18).toFixed(decimals);
}

export const MAX_INT_256 = 2n ** 256n - 1n;
