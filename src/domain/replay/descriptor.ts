import { dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type {
  ContentVersion,
  FamilyId,
  GeneratorVersion,
  RngAlgorithmId,
} from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { parseSeed, seedHex, RNG_ALGORITHM_ID } from '../random/xoshiro';
import {
  canonicalize,
  CANONICALIZATION_VERSION,
  parseCanonicalData,
} from './canonical';
import type { JsonValue } from './canonical';

export interface ReplayDescriptor {
  readonly schema: 'replay-v1';
  readonly canonicalization: 'canonical-json-v1';
  readonly semanticVersion: 'semantic-v1';
  readonly familyId: FamilyId;
  readonly generatorVersion: GeneratorVersion;
  readonly contentVersion: ContentVersion;
  readonly rngAlgorithm: RngAlgorithmId;
  readonly seedHex: string;
  readonly spec: { readonly [key: string]: JsonValue };
}

export function replayFromDto(input: unknown): DomainResult<ReplayDescriptor> {
  // Validate bounded data before touching nested fields; rebuild into detached plain data.
  const canonical = canonicalize(input);
  if (!canonical.ok) return failure('invalid_replay');
  const parsed = parseCanonicalData(canonical.value);
  if (!parsed.ok) return failure('invalid_replay');
  const data = dataRecord(parsed.value);
  if (
    !data ||
    !hasKeys(data, [
      'schema',
      'canonicalization',
      'semanticVersion',
      'familyId',
      'generatorVersion',
      'contentVersion',
      'rngAlgorithm',
      'seedHex',
      'spec',
    ])
  )
    return failure('invalid_replay');
  if (
    data.schema !== 'replay-v1' ||
    data.canonicalization !== CANONICALIZATION_VERSION ||
    data.semanticVersion !== 'semantic-v1' ||
    data.rngAlgorithm !== RNG_ALGORITHM_ID
  )
    return failure('unsupported_version');
  const family = identifier('family', data.familyId);
  const generator = identifier('generatorVersion', data.generatorVersion);
  const content = identifier('contentVersion', data.contentVersion);
  const algorithm = identifier('rngAlgorithm', data.rngAlgorithm);
  const seed = parseSeed(data.seedHex);
  const spec = dataRecord(data.spec);
  if (
    !family.ok ||
    !generator.ok ||
    !content.ok ||
    !algorithm.ok ||
    !seed.ok ||
    !spec
  )
    return failure('invalid_replay');
  const hex = seedHex(seed.value);
  if (!hex.ok) return failure('invalid_replay');
  return success({
    schema: 'replay-v1',
    canonicalization: CANONICALIZATION_VERSION,
    semanticVersion: 'semantic-v1',
    familyId: family.value,
    generatorVersion: generator.value,
    contentVersion: content.value,
    rngAlgorithm: algorithm.value,
    seedHex: hex.value,
    spec: spec as { readonly [key: string]: JsonValue },
  });
}

export function replayToCanonical(input: unknown): DomainResult<string> {
  const descriptor = replayFromDto(input);
  return descriptor.ok ? canonicalize(descriptor.value) : descriptor;
}

export interface ReplaySupport {
  readonly familyId: FamilyId;
  readonly generatorVersion: GeneratorVersion;
  readonly contentVersion: ContentVersion;
}

/** A static registry declares exact supported family/generator/content triplets. */
export function requireReplaySupport(
  descriptor: ReplayDescriptor,
  supported: readonly ReplaySupport[],
): DomainResult<ReplayDescriptor> {
  const checked = replayFromDto(descriptor);
  if (!checked.ok) return checked;
  return supported.some(
    (entry) =>
      entry.familyId === descriptor.familyId &&
      entry.generatorVersion === descriptor.generatorVersion &&
      entry.contentVersion === descriptor.contentVersion,
  )
    ? checked
    : failure('unsupported_version');
}
