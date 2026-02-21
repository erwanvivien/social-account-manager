export function assert<T>(value: T, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? "Value does not respect assert");
  }
}

export function assertDefined<T>(
  value: T | undefined | null,
  message?: string,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message ?? "Value is undefined");
  }
}

export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${value}`);
}
