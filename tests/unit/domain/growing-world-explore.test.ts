import { describe, expect, it } from 'vitest';
import {
  arrayRelationship,
  changeArray,
  changeSplit,
  splitRelationship,
} from '../../../src/domain/growing-world/explore';
import type {
  ArrayWorkspace,
  SplitWorkspace,
} from '../../../src/domain/growing-world/explore';

describe('finite session-only mathematical workshops', () => {
  it('enumerates every partition and preserves a whole when a tile changes parts', () => {
    let checked = 0;
    for (let total = 0; total <= 20; total += 1) {
      for (let left = 0; left <= total; left += 1) {
        const state: SplitWorkspace = { kind: 'split', total, left };
        const relation = splitRelationship(state);
        expect(relation.ok).toBe(true);
        if (!relation.ok) throw new Error('A bounded partition was rejected');
        expect(relation.value.left + relation.value.right).toBe(total);
        expect(
          relation.value.tenAndRest[0] + relation.value.tenAndRest[1],
        ).toBe(total);
        const next = changeSplit(state, 'moveRight');
        expect(next.ok).toBe(left > 0);
        if (next.ok) {
          expect(next.value.total).toBe(total);
          expect(changeSplit(next.value, 'moveLeft')).toEqual({
            ok: true,
            value: state,
          });
        }
        const other = changeSplit(state, 'moveLeft');
        expect(other.ok).toBe(left < total);
        if (other.ok)
          expect(changeSplit(other.value, 'moveRight')).toEqual({
            ok: true,
            value: state,
          });
        const added = changeSplit(state, 'add');
        expect(added.ok).toBe(total < 20);
        if (added.ok)
          expect(changeSplit(added.value, 'remove')).toEqual({
            ok: true,
            value: state,
          });
        expect(changeSplit(state, 'remove').ok).toBe(total > 0);
        checked += 1;
      }
    }
    expect(checked).toBe(231);
  });

  it('enumerates every array against independent row counting and inverse actions', () => {
    let checked = 0;
    for (let rows = 1; rows <= 5; rows += 1) {
      for (let columns = 1; columns <= 5; columns += 1) {
        const state: ArrayWorkspace = { kind: 'array', rows, columns };
        const relation = arrayRelationship(state);
        expect(relation.ok).toBe(true);
        if (!relation.ok) throw new Error('A bounded array was rejected');
        let counted = 0;
        for (let row = 0; row < rows; row += 1)
          for (let column = 0; column < columns; column += 1) counted += 1;
        expect(relation.value.total).toBe(counted);
        expect(
          relation.value.repeatedAddends.reduce((all, row) => all + row, 0),
        ).toBe(counted);
        expect(relation.value.principalRoot).toBe(
          rows === columns ? columns : null,
        );
        const turned = changeArray(state, 'turn');
        expect(turned.ok).toBe(true);
        if (!turned.ok) throw new Error('An array could not turn');
        expect(arrayRelationship(turned.value)).toMatchObject({
          ok: true,
          value: { total: counted },
        });
        expect(changeArray(turned.value, 'turn')).toEqual({
          ok: true,
          value: state,
        });
        const added = changeArray(state, 'addRow');
        expect(added.ok).toBe(rows < 5);
        if (added.ok)
          expect(changeArray(added.value, 'removeRow')).toEqual({
            ok: true,
            value: state,
          });
        const wider = changeArray(state, 'addColumn');
        expect(wider.ok).toBe(columns < 5);
        if (wider.ok)
          expect(changeArray(wider.value, 'removeColumn')).toEqual({
            ok: true,
            value: state,
          });
        expect(changeArray(state, 'removeRow').ok).toBe(rows > 1);
        expect(changeArray(state, 'removeColumn').ok).toBe(columns > 1);
        checked += 1;
      }
    }
    expect(checked).toBe(25);
  });

  it('rejects fractions and workspace boundaries without clamping or changing meaning', () => {
    for (const total of [-1, 21, 1.5, Number.NaN])
      expect(splitRelationship({ kind: 'split', total, left: 0 }).ok).toBe(
        false,
      );
    for (const rows of [0, 6, 1.5, Number.POSITIVE_INFINITY])
      expect(arrayRelationship({ kind: 'array', rows, columns: 2 }).ok).toBe(
        false,
      );
    expect(splitRelationship({ kind: 'split', total: 5, left: 6 }).ok).toBe(
      false,
    );
  });
});
