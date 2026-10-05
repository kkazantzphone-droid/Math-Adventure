import { failure, success } from './result';
import type { DomainResult } from './result';

export type IdentifierKind =
  | 'concept'
  | 'family'
  | 'representation'
  | 'generatorVersion'
  | 'contentVersion'
  | 'rngAlgorithm'
  | 'unit'
  | 'semanticObject'
  | 'instance';

declare const identifierBrand: unique symbol;
export type Identifier<K extends IdentifierKind> = string & {
  readonly [identifierBrand]: K;
};
export type ConceptId = Identifier<'concept'>;
export type FamilyId = Identifier<'family'>;
export type RepresentationId = Identifier<'representation'>;
export type GeneratorVersion = Identifier<'generatorVersion'>;
export type ContentVersion = Identifier<'contentVersion'>;
export type RngAlgorithmId = Identifier<'rngAlgorithm'>;
export type UnitId = Identifier<'unit'>;
export type SemanticObjectId = Identifier<'semanticObject'>;
export type InstanceId = Identifier<'instance'>;

// Lowercase ASCII, 1–96 characters; separators cannot be repeated or terminal.
// No case folding, whitespace trimming or other implicit normalization.
export function identifier<K extends IdentifierKind>(
  kind: K,
  input: unknown,
): DomainResult<Identifier<K>> {
  if (
    typeof input !== 'string' ||
    input.length > 96 ||
    !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(input)
  ) {
    return failure('malformed_identifier');
  }
  void kind;
  return success(input as Identifier<K>);
}
