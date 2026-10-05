// For decoded DTOs: plain own data only. Accessor properties are never invoked.
// Proxies are executable objects and outside the decoded-data trust boundary.
export function dataRecord(
  input: unknown,
  maxKeys = 256,
): Record<string, unknown> | undefined {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  if (Object.getOwnPropertySymbols(input).length !== 0) return undefined;
  const keys = Object.getOwnPropertyNames(input);
  if (keys.length > maxKeys) return undefined;
  const output: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable)
      return undefined;
    output[key] = descriptor.value as unknown;
  }
  return output;
}

export function dataArray(
  input: unknown,
  maxLength = 256,
): readonly unknown[] | undefined {
  if (
    !Array.isArray(input) ||
    input.length > maxLength ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    Object.getOwnPropertySymbols(input).length !== 0
  )
    return undefined;
  if (Object.getOwnPropertyNames(input).length !== input.length + 1)
    return undefined;
  const output: unknown[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(i));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable)
      return undefined;
    output.push(descriptor.value as unknown);
  }
  return output;
}

export function hasKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
  );
}
