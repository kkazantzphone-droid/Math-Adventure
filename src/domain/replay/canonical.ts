import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';

export type JsonValue =
  | null
  | boolean
  | string
  | number
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
export const CANONICALIZATION_VERSION = 'canonical-json-v1';
export const CANONICAL_LIMITS = Object.freeze({
  depth: 32,
  nodes: 10_000,
  text: 4_096,
  output: 262_144,
});

/** Bounded data-only JSON. Object keys sort by UTF-16 code units; array order stays meaningful.
 * Numbers are safe integers (-0 emits 0); exact nonintegers use explicit value DTOs.
 * No accessors/toJSON/prototype methods are invoked. Executable Proxies are not decoded data.
 */
export function canonicalize(input: unknown): DomainResult<string> {
  const active = new Set<object>();
  let nodes = 0;
  let length = 0;
  const pieces: string[] = [];
  function emit(piece: string): boolean {
    length += piece.length;
    if (length > CANONICAL_LIMITS.output) return false;
    pieces.push(piece);
    return true;
  }
  function visit(value: unknown, depth: number): boolean {
    nodes += 1;
    if (nodes > CANONICAL_LIMITS.nodes || depth > CANONICAL_LIMITS.depth)
      return false;
    if (value === null) return emit('null');
    if (typeof value === 'boolean') return emit(value ? 'true' : 'false');
    if (typeof value === 'string')
      return (
        value.length <= CANONICAL_LIMITS.text && emit(JSON.stringify(value))
      );
    if (typeof value === 'number')
      return (
        Number.isSafeInteger(value) && emit(String(value === 0 ? 0 : value))
      );
    if (typeof value !== 'object' || active.has(value)) return false;
    if (Object.getOwnPropertySymbols(value).length > 0) return false;
    const names = Object.getOwnPropertyNames(value);
    if (names.length > CANONICAL_LIMITS.nodes) return false;
    const prototype: unknown = Object.getPrototypeOf(value);
    active.add(value);
    let valid: boolean;
    if (Array.isArray(value)) {
      const count = value.length;
      valid =
        prototype === Array.prototype &&
        count <= CANONICAL_LIMITS.nodes &&
        names.length === count + 1 &&
        emit('[');
      for (let i = 0; valid && i < count; i += 1) {
        const property = Object.getOwnPropertyDescriptor(value, String(i));
        valid =
          !!property &&
          'value' in property &&
          property.enumerable === true &&
          (i === 0 || emit(',')) &&
          visit(property.value as unknown, depth + 1);
      }
      if (valid) valid = emit(']');
    } else {
      let minimumSize = 2;
      for (const key of names) {
        minimumSize += key.length + 3;
        if (
          key.length > CANONICAL_LIMITS.text ||
          minimumSize > CANONICAL_LIMITS.output
        ) {
          active.delete(value);
          return false;
        }
      }
      valid =
        (prototype === Object.prototype || prototype === null) && emit('{');
      if (valid) names.sort();
      for (let i = 0; valid && i < names.length; i += 1) {
        const key = names[i];
        if (key === undefined || key.length > CANONICAL_LIMITS.text) {
          valid = false;
          break;
        }
        const property = Object.getOwnPropertyDescriptor(value, key);
        valid =
          !!property &&
          'value' in property &&
          property.enumerable === true &&
          (i === 0 || emit(',')) &&
          emit(JSON.stringify(key)) &&
          emit(':') &&
          visit(property.value as unknown, depth + 1);
      }
      if (valid) valid = emit('}');
    }
    active.delete(value);
    return valid;
  }
  return visit(input, 0) ? success(pieces.join('')) : failure('invalid_input');
}

export function parseCanonicalData(text: unknown): DomainResult<JsonValue> {
  if (typeof text !== 'string' || text.length > CANONICAL_LIMITS.output)
    return failure('invalid_input');
  let decoded: unknown;
  try {
    decoded = JSON.parse(text) as unknown;
  } catch {
    return failure('invalid_input');
  }
  const result = canonicalize(decoded);
  // Require the exact canonical spelling, before parsed/rounded numeric tokens
  // can be accepted as mathematical spec data. Also rejects duplicate keys.
  return result.ok && result.value === text
    ? success(decoded as JsonValue)
    : failure('invalid_input');
}
