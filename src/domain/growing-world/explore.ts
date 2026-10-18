import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';

/** A finite mathematical workspace, never a learner observation or saved record. */
export interface SplitWorkspace {
  readonly kind: 'split';
  readonly total: number;
  readonly left: number;
}

export interface ArrayWorkspace {
  readonly kind: 'array';
  readonly rows: number;
  readonly columns: number;
}

export const EXPLORE_BOUNDS = Object.freeze({ total: 20, side: 5 });
export const INITIAL_SPLIT: SplitWorkspace = Object.freeze({
  kind: 'split',
  total: 12,
  left: 8,
});
export const INITIAL_ARRAY: ArrayWorkspace = Object.freeze({
  kind: 'array',
  rows: 3,
  columns: 4,
});

export type SplitAction = 'add' | 'remove' | 'moveLeft' | 'moveRight';
export type ArrayAction =
  'addRow' | 'removeRow' | 'addColumn' | 'removeColumn' | 'turn' | 'square';

function integer(value: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

export function splitRelationship(workspace: SplitWorkspace): DomainResult<{
  readonly total: number;
  readonly left: number;
  readonly right: number;
  readonly tenAndRest: readonly [number, number];
}> {
  if (
    workspace.kind !== 'split' ||
    !integer(workspace.total, EXPLORE_BOUNDS.total) ||
    !integer(workspace.left, workspace.total)
  )
    return failure('invalid_input');
  return success({
    total: workspace.total,
    left: workspace.left,
    right: workspace.total - workspace.left,
    tenAndRest: [
      Math.min(10, workspace.total),
      Math.max(0, workspace.total - 10),
    ],
  });
}

/** Integer arithmetic is exact inside the declared small workspace bounds. */
export function changeSplit(
  workspace: SplitWorkspace,
  action: SplitAction,
): DomainResult<SplitWorkspace> {
  const relation = splitRelationship(workspace);
  if (!relation.ok) return relation;
  switch (action) {
    case 'add':
      if (workspace.total === EXPLORE_BOUNDS.total)
        return failure('range_exceeded');
      return success({ ...workspace, total: workspace.total + 1 });
    case 'remove':
      if (workspace.total === 0) return failure('range_exceeded');
      return success({
        ...workspace,
        total: workspace.total - 1,
        left: Math.min(workspace.left, workspace.total - 1),
      });
    case 'moveLeft':
      if (relation.value.right === 0) return failure('range_exceeded');
      return success({ ...workspace, left: workspace.left + 1 });
    case 'moveRight':
      if (workspace.left === 0) return failure('range_exceeded');
      return success({ ...workspace, left: workspace.left - 1 });
    default:
      return failure('invalid_input');
  }
}

export function arrayRelationship(workspace: ArrayWorkspace): DomainResult<{
  readonly rows: number;
  readonly columns: number;
  readonly total: number;
  readonly repeatedAddends: readonly number[];
  readonly isSquare: boolean;
  /** A principal root/side length is exposed only for a square arrangement. */
  readonly principalRoot: number | null;
}> {
  if (
    workspace.kind !== 'array' ||
    !integer(workspace.rows, EXPLORE_BOUNDS.side) ||
    !integer(workspace.columns, EXPLORE_BOUNDS.side) ||
    workspace.rows === 0 ||
    workspace.columns === 0
  )
    return failure('invalid_input');
  const isSquare = workspace.rows === workspace.columns;
  return success({
    rows: workspace.rows,
    columns: workspace.columns,
    total: workspace.rows * workspace.columns,
    repeatedAddends: Array.from(
      { length: workspace.rows },
      () => workspace.columns,
    ),
    isSquare,
    principalRoot: isSquare ? workspace.rows : null,
  });
}

export function changeArray(
  workspace: ArrayWorkspace,
  action: ArrayAction,
): DomainResult<ArrayWorkspace> {
  const relation = arrayRelationship(workspace);
  if (!relation.ok) return relation;
  const candidate =
    action === 'addRow'
      ? { ...workspace, rows: workspace.rows + 1 }
      : action === 'removeRow'
        ? { ...workspace, rows: workspace.rows - 1 }
        : action === 'addColumn'
          ? { ...workspace, columns: workspace.columns + 1 }
          : action === 'removeColumn'
            ? { ...workspace, columns: workspace.columns - 1 }
            : action === 'turn'
              ? {
                  ...workspace,
                  rows: workspace.columns,
                  columns: workspace.rows,
                }
              : action === 'square'
                ? { ...workspace, rows: workspace.columns }
                : null;
  if (candidate === null) return failure('invalid_input');
  return arrayRelationship(candidate).ok
    ? success(candidate)
    : failure('range_exceeded');
}
