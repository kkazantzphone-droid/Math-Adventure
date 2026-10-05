import { dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { rationalFromDto, rationalToDto } from '../math/rational';
import type { RationalDto } from '../math/rational';

export type ExpressionNode =
  | { readonly kind: 'literal'; readonly value: RationalDto }
  | { readonly kind: 'unknown'; readonly symbolId: string }
  | {
      readonly kind: 'add' | 'subtract' | 'multiply' | 'divide';
      readonly left: ExpressionNode;
      readonly right: ExpressionNode;
    }
  | {
      readonly kind: 'power';
      readonly base: ExpressionNode;
      readonly exponent: number;
    }
  | { readonly kind: 'principalSquareRoot'; readonly radicand: ExpressionNode };

export interface ExpressionDto {
  readonly schema: 'expression-v1';
  readonly root: ExpressionNode;
}

export const EXPRESSION_LIMITS = Object.freeze({ depth: 16, nodes: 127 });

export function expressionFromDto(input: unknown): DomainResult<ExpressionDto> {
  const record = dataRecord(input);
  if (!record || !hasKeys(record, ['schema', 'root']))
    return failure('invalid_input');
  if (record.schema !== 'expression-v1') return failure('unsupported_version');
  let count = 0;
  function parseNode(
    inputNode: unknown,
    depth: number,
  ): DomainResult<ExpressionNode> {
    count += 1;
    if (depth > EXPRESSION_LIMITS.depth || count > EXPRESSION_LIMITS.nodes)
      return failure('range_exceeded');
    const node = dataRecord(inputNode);
    if (!node) return failure('invalid_input');
    if (node.kind === 'literal' && hasKeys(node, ['kind', 'value'])) {
      const value = rationalFromDto(node.value);
      return value.ok
        ? success({ kind: 'literal', value: rationalToDto(value.value) })
        : value;
    }
    if (node.kind === 'unknown' && hasKeys(node, ['kind', 'symbolId'])) {
      const symbol = identifier('representation', node.symbolId);
      return symbol.ok
        ? success({ kind: 'unknown', symbolId: symbol.value })
        : symbol;
    }
    if (
      (node.kind === 'add' ||
        node.kind === 'subtract' ||
        node.kind === 'multiply' ||
        node.kind === 'divide') &&
      hasKeys(node, ['kind', 'left', 'right'])
    ) {
      const left = parseNode(node.left, depth + 1);
      if (!left.ok) return left;
      const right = parseNode(node.right, depth + 1);
      if (!right.ok) return right;
      return success({ kind: node.kind, left: left.value, right: right.value });
    }
    if (node.kind === 'power' && hasKeys(node, ['kind', 'base', 'exponent'])) {
      if (
        typeof node.exponent !== 'number' ||
        !Number.isSafeInteger(node.exponent) ||
        node.exponent < 0
      )
        return failure('unsupported_operation');
      const base = parseNode(node.base, depth + 1);
      return base.ok
        ? success({ kind: 'power', base: base.value, exponent: node.exponent })
        : base;
    }
    if (
      node.kind === 'principalSquareRoot' &&
      hasKeys(node, ['kind', 'radicand'])
    ) {
      const radicand = parseNode(node.radicand, depth + 1);
      return radicand.ok
        ? success({ kind: 'principalSquareRoot', radicand: radicand.value })
        : radicand;
    }
    return failure('unsupported_operation');
  }
  const root = parseNode(record.root, 1);
  return root.ok
    ? success({ schema: 'expression-v1', root: root.value })
    : root;
}

// An AST is notation/semantic data, not an evaluated result. In particular a
// principalSquareRoot node is not an equation's complete real solution set.
