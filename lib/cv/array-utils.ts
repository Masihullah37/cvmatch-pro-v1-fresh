export function removeArrayItemAt<T>(items: readonly T[], index: number): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    return [...items];
  }

  return [...items.slice(0, index), ...items.slice(index + 1)];
}
