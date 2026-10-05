import { describe, expect, it } from 'vitest';
import {
  prototypeArrayCells,
  prototypeDotGroups,
  prototypeRepresentations,
  prototypeScenarios,
} from '../../src/ui/prototype/fixtures';
import type { PrototypeActivity } from '../../src/ui/prototype/fixtures';
import {
  initialPrototypeState,
  prototypeReducer,
} from '../../src/ui/prototype/model';
import type {
  PrototypeAction,
  PrototypeState,
} from '../../src/ui/prototype/model';
import { prototypeCopy } from '../../src/ui/prototype/copy';
import { parsePrototypeLanguage } from '../../src/ui/prototype/options';

function startActivity(activity: PrototypeActivity): PrototypeState {
  const home = prototypeReducer(initialPrototypeState, {
    type: 'selectBadge',
    badge: 'star',
  });
  return prototypeReducer(home, { type: 'openActivity', activity });
}

function nonEmptyTextCopy(value: unknown): boolean {
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value))
    return value.length > 0 && value.every(nonEmptyTextCopy);
  if (value !== null && typeof value === 'object') {
    const values: readonly unknown[] = Object.values(value);
    return values.length > 0 && values.every(nonEmptyTextCopy);
  }
  return false;
}

describe('transient scripted prototype state', () => {
  it('starts at badge selection and preserves the independently chosen synthetic badge', () => {
    expect(initialPrototypeState).toEqual({ screen: 'badges' });
    for (const badge of ['star', 'triangle'] as const) {
      const home = prototypeReducer(initialPrototypeState, {
        type: 'selectBadge',
        badge,
      });
      expect(home).toEqual({ screen: 'home', badge });
      expect(prototypeReducer(home, { type: 'openExplore' })).toEqual({
        screen: 'explore',
        badge,
        representation: null,
      });
      expect(
        prototypeReducer(home, { type: 'openActivity', activity: 'number' }),
      ).toEqual({
        screen: 'activity',
        badge,
        activity: 'number',
        hintVisible: false,
        selectedChoice: null,
        feedback: 'none',
      });
    }
  });

  it.each([
    ['number', 'four', 'five'],
    ['number', 'six', 'five'],
    ['shape', 'triangle', 'square'],
    ['shape', 'rectangle', 'square'],
  ] as const)(
    'allows immediate hint, repeated retry and successful retry after %s / %s',
    (activity, nonTarget, target) => {
      const start = startActivity(activity);
      const retry = prototypeReducer(start, {
        type: 'choose',
        choiceId: nonTarget,
      });
      expect(retry).toEqual({
        screen: 'activity',
        badge: 'star',
        activity,
        hintVisible: false,
        selectedChoice: nonTarget,
        feedback: 'retry',
      });
      expect(
        prototypeReducer(retry, { type: 'choose', choiceId: nonTarget }),
      ).toEqual(retry);
      const hinted = prototypeReducer(retry, { type: 'showHint' });
      expect(hinted).toEqual({ ...retry, hintVisible: true });
      expect(prototypeReducer(hinted, { type: 'showHint' })).toEqual(hinted);
      expect(
        prototypeReducer(hinted, { type: 'choose', choiceId: nonTarget }),
      ).toEqual(hinted);
      const success = prototypeReducer(hinted, {
        type: 'choose',
        choiceId: target,
      });
      expect(success).toEqual({ screen: 'success', badge: 'star', activity });
      expect(prototypeReducer(success, { type: 'continue' })).toEqual({
        screen: 'home',
        badge: 'star',
      });
    },
  );

  it.each(['number', 'shape'] as const)(
    'reveals the %s hint without choosing, feedback or automatic advancement',
    (activity) => {
      const start = startActivity(activity);
      const hinted = prototypeReducer(start, { type: 'showHint' });
      expect(hinted).toEqual({ ...start, hintVisible: true });
      expect(prototypeReducer(hinted, { type: 'continue' })).toBe(hinted);
      expect(prototypeReducer(start, { type: 'continue' })).toBe(start);
      expect(
        prototypeReducer(start, { type: 'choose', choiceId: 'unknown' }),
      ).toBe(start);
      expect(
        prototypeReducer(hinted, { type: 'choose', choiceId: 'unknown' }),
      ).toBe(hinted);
    },
  );

  it('changes exploratory representation without assessment, score or a success state', () => {
    const home = prototypeReducer(initialPrototypeState, {
      type: 'selectBadge',
      badge: 'triangle',
    });
    let explored = prototypeReducer(home, { type: 'openExplore' });
    for (const representation of [
      'root',
      'square',
      'multiply',
      'root',
    ] as const) {
      explored = prototypeReducer(explored, {
        type: 'selectRepresentation',
        representation,
      });
      expect(explored).toEqual({
        screen: 'explore',
        badge: 'triangle',
        representation,
      });
      expect(
        prototypeReducer(explored, { type: 'choose', choiceId: 'five' }),
      ).toBe(explored);
      expect(
        prototypeReducer(explored, { type: 'choose', choiceId: 'square' }),
      ).toBe(explored);
      expect(prototypeReducer(explored, { type: 'showHint' })).toBe(explored);
      expect(prototypeReducer(explored, { type: 'continue' })).toBe(explored);
    }
  });

  it('keeps Home, Back and Continue bounded and provides recovery from every screen', () => {
    const home: PrototypeState = { screen: 'home', badge: 'triangle' };
    const activity: PrototypeState = {
      screen: 'activity',
      badge: 'triangle',
      activity: 'shape',
      hintVisible: true,
      selectedChoice: 'rectangle',
      feedback: 'retry',
    };
    const success: PrototypeState = {
      screen: 'success',
      badge: 'triangle',
      activity: 'shape',
    };
    const explore: PrototypeState = {
      screen: 'explore',
      badge: 'triangle',
      representation: 'root',
    };
    for (const state of [home, activity, success, explore]) {
      expect(prototypeReducer(state, { type: 'home' })).toEqual(home);
      expect(prototypeReducer(state, { type: 'back' })).toEqual(
        state.screen === 'home' ? initialPrototypeState : home,
      );
      expect(prototypeReducer(state, { type: 'continue' })).toEqual(
        state.screen === 'success' ? home : state,
      );
    }
    for (const type of ['home', 'back', 'continue'] as const) {
      expect(prototypeReducer(initialPrototypeState, { type })).toBe(
        initialPrototypeState,
      );
    }
    const restarted = prototypeReducer(
      prototypeReducer(activity, { type: 'home' }),
      { type: 'openActivity', activity: 'shape' },
    );
    expect(restarted).toEqual({
      screen: 'activity',
      badge: 'triangle',
      activity: 'shape',
      hintVisible: false,
      selectedChoice: null,
      feedback: 'none',
    });
  });

  it('ignores actions that are invalid for the current screen instead of creating hidden transitions', () => {
    const states: readonly PrototypeState[] = [
      initialPrototypeState,
      { screen: 'home', badge: 'star' },
      startActivity('number'),
      { screen: 'success', badge: 'star', activity: 'number' },
      { screen: 'explore', badge: 'star', representation: 'multiply' },
    ];
    const actions: readonly {
      action: PrototypeAction;
      permittedScreen: PrototypeState['screen'];
    }[] = [
      {
        action: { type: 'selectBadge', badge: 'triangle' },
        permittedScreen: 'badges',
      },
      {
        action: { type: 'openActivity', activity: 'shape' },
        permittedScreen: 'home',
      },
      { action: { type: 'openExplore' }, permittedScreen: 'home' },
      {
        action: { type: 'choose', choiceId: 'five' },
        permittedScreen: 'activity',
      },
      { action: { type: 'showHint' }, permittedScreen: 'activity' },
      {
        action: { type: 'selectRepresentation', representation: 'root' },
        permittedScreen: 'explore',
      },
      { action: { type: 'continue' }, permittedScreen: 'success' },
    ];
    for (const state of states) {
      for (const { action, permittedScreen } of actions) {
        if (state.screen !== permittedScreen)
          expect(prototypeReducer(state, action)).toBe(state);
      }
    }
  });

  it('replays explicit navigation deterministically without retaining input or adding learner fields', () => {
    const actions: readonly PrototypeAction[] = [
      { type: 'selectBadge', badge: 'triangle' },
      { type: 'openActivity', activity: 'number' },
      { type: 'choose', choiceId: 'six' },
      { type: 'showHint' },
      { type: 'choose', choiceId: 'five' },
      { type: 'continue' },
      { type: 'openExplore' },
      { type: 'selectRepresentation', representation: 'root' },
      { type: 'back' },
      { type: 'back' },
    ];
    const replay = (): PrototypeState[] => {
      let state: PrototypeState = initialPrototypeState;
      return actions.map((action) => {
        const previous = state;
        const inputSnapshot = JSON.stringify(state);
        state = prototypeReducer(state, action);
        expect(JSON.stringify(previous)).toBe(inputSnapshot);
        return state;
      });
    };
    const first = replay();
    expect(replay()).toEqual(first);
    expect(first.at(-1)).toEqual(initialPrototypeState);
    expect(JSON.stringify(first)).not.toMatch(
      /learner|profile|mastery|evidence|score|timestamp|reward/i,
    );
  });
});

describe('independent scripted fixture and semantic review', () => {
  it('uses independently checked fixed number and shape outcomes and canonical choice order', () => {
    expect(prototypeScenarios).toEqual({
      number: {
        id: 'number',
        display: '3 + 2 = ?',
        choices: [
          { id: 'four', display: '4', outcome: 'retry' },
          { id: 'five', display: '5', outcome: 'success' },
          { id: 'six', display: '6', outcome: 'retry' },
        ],
      },
      shape: {
        id: 'shape',
        display: 'square',
        choices: [
          {
            id: 'triangle',
            display: 'triangle',
            shape: 'triangle',
            outcome: 'retry',
          },
          {
            id: 'square',
            display: 'square',
            shape: 'square',
            outcome: 'success',
          },
          {
            id: 'rectangle',
            display: 'rectangle',
            shape: 'rectangle',
            outcome: 'retry',
          },
        ],
      },
    });
    expect(3 + 2).toBe(5);
    expect(prototypeDotGroups.map((group) => group.length)).toEqual([3, 2]);
  });

  it('shows equivalent static representations of sixteen without generated tasks', () => {
    expect(prototypeRepresentations).toEqual([
      { id: 'multiply', display: '4 × 4 = 16' },
      { id: 'square', display: '4² = 16' },
      { id: 'root', display: '√16 = 4' },
    ]);
    expect(4 * 4).toBe(16);
    expect(4 ** 2).toBe(16);
    expect(Math.sqrt(16)).toBe(4);
    expect(prototypeArrayCells).toHaveLength(16);
    expect(new Set(prototypeArrayCells).size).toBe(16);
  });

  it('provides the same small copy schema in both languages without changing tasks or outcomes', () => {
    expect(Object.keys(prototypeCopy.el).sort()).toEqual(
      Object.keys(prototypeCopy.en).sort(),
    );
    expect(prototypeCopy.el.locale).toBe('el-GR');
    expect(prototypeCopy.en.locale).toBe('en-GB');
    expect(Object.keys(prototypeCopy).sort()).toEqual(['el', 'en']);
    for (const copy of [prototypeCopy.el, prototypeCopy.en]) {
      expect(copy.shapeChoices).toHaveLength(3);
      expect(copy.representations).toHaveLength(3);
      const { exploreGuides, ...nonGuideCopy } = copy;
      expect(nonEmptyTextCopy(nonGuideCopy)).toBe(true);
      expect(nonEmptyTextCopy(exploreGuides.multiply)).toBe(true);
      expect(nonEmptyTextCopy(exploreGuides.square)).toBe(true);
      expect(exploreGuides.root).toBe('');
      expect(Object.keys(copy.exploreGuides).sort()).toEqual([
        'multiply',
        'root',
        'square',
      ]);
      expect(JSON.stringify(Object.keys(copy))).not.toMatch(
        /outcome|task|choiceId|answer|reward|score/i,
      );
    }
    expect(prototypeCopy.en.representations).toEqual([
      'Four times four equals sixteen',
      'Four squared equals sixteen',
      '16 tiles in a square',
    ]);
    expect(prototypeCopy.el.representations).toEqual([
      'Τέσσερα επί τέσσερα ίσον δεκαέξι',
      'Τέσσερα στο τετράγωνο ίσον δεκαέξι',
      '16 πλακάκια σε τετράγωνο',
    ]);
    expect(prototypeCopy.en.rootNotation).toBe(
      'Principal square root of sixteen equals four',
    );
    expect(prototypeCopy.el.rootNotation).toBe(
      'Κύρια τετραγωνική ρίζα του δεκαέξι ίσον τέσσερα',
    );
  });
});

describe('bounded deterministic URL options', () => {
  it.each([
    ['', 'el'],
    ['?', 'el'],
    ['?variant=a', 'el'],
    ['?variant=b', 'el'],
    ['?variant=c', 'el'],
    ['?variant=B', 'el'],
    ['?variant=', 'el'],
    ['?variant=%', 'el'],
    ['?variant=%ZZ', 'el'],
    ['?variant=unknown', 'el'],
    ['?variant=b&variant=b', 'el'],
    ['?variant=b&variant=c', 'el'],
    ['?variant=c&variant=', 'el'],
    ['?VARIANT=c', 'el'],
    ['?lang=en&unrelated=1', 'en'],
    ['?variant=c&lang=en', 'en'],
  ] as const)(
    'keeps language %s deterministic when retired variant options are present (%s)',
    (query, expected) => {
      expect(parsePrototypeLanguage(query)).toBe(expected);
      expect(parsePrototypeLanguage(query)).toBe(expected);
    },
  );

  it.each([
    ['', 'el'],
    ['?', 'el'],
    ['?lang=el', 'el'],
    ['?lang=en', 'en'],
    ['?lang=EN', 'el'],
    ['?lang=', 'el'],
    ['?lang=%', 'el'],
    ['?lang=%ZZ', 'el'],
    ['?lang=en-GB', 'el'],
    ['?lang=de', 'el'],
    ['?lang=de-DE', 'el'],
    ['?variant=b&lang=de', 'el'],
    ['?lang=de&lang=en', 'el'],
    ['?lang=en&lang=en', 'el'],
    ['?lang=en&lang=el', 'el'],
    ['?lang=en&lang=', 'el'],
    ['?LANG=en', 'el'],
    ['?variant=c', 'el'],
    ['?variant=c&lang=en', 'en'],
  ] as const)('parses prototype language %s as %s', (query, expected) => {
    expect(parsePrototypeLanguage(query)).toBe(expected);
    expect(parsePrototypeLanguage(query)).toBe(expected);
  });
});
