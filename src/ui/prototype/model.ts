import { prototypeScenarios } from './fixtures';
import type { PrototypeActivity, PrototypeRepresentation } from './fixtures';

export type PrototypeBadge = 'star' | 'triangle';
export type PrototypeState =
  | { readonly screen: 'badges' }
  | { readonly screen: 'home'; readonly badge: PrototypeBadge }
  | {
      readonly screen: 'activity';
      readonly badge: PrototypeBadge;
      readonly activity: PrototypeActivity;
      readonly hintVisible: boolean;
      readonly selectedChoice: string | null;
      readonly feedback: 'none' | 'retry';
    }
  | {
      readonly screen: 'success';
      readonly badge: PrototypeBadge;
      readonly activity: PrototypeActivity;
    }
  | {
      readonly screen: 'explore';
      readonly badge: PrototypeBadge;
      readonly representation: PrototypeRepresentation | null;
    };

export type PrototypeAction =
  | { readonly type: 'selectBadge'; readonly badge: PrototypeBadge }
  | { readonly type: 'openActivity'; readonly activity: PrototypeActivity }
  | { readonly type: 'openExplore' }
  | { readonly type: 'choose'; readonly choiceId: string }
  | { readonly type: 'showHint' }
  | {
      readonly type: 'selectRepresentation';
      readonly representation: PrototypeRepresentation;
    }
  | { readonly type: 'home' | 'back' | 'continue' };

export const initialPrototypeState: PrototypeState = { screen: 'badges' };

/** Deterministic transient demo navigation. No learner or application command. */
export function prototypeReducer(
  state: PrototypeState,
  action: PrototypeAction,
): PrototypeState {
  switch (action.type) {
    case 'selectBadge':
      return state.screen === 'badges'
        ? { screen: 'home', badge: action.badge }
        : state;
    case 'openActivity':
      return state.screen === 'home'
        ? {
            screen: 'activity',
            badge: state.badge,
            activity: action.activity,
            hintVisible: false,
            selectedChoice: null,
            feedback: 'none',
          }
        : state;
    case 'openExplore':
      return state.screen === 'home'
        ? { screen: 'explore', badge: state.badge, representation: null }
        : state;
    case 'choose': {
      if (state.screen !== 'activity') return state;
      const choice = prototypeScenarios[state.activity].choices.find(
        (candidate) => candidate.id === action.choiceId,
      );
      if (choice === undefined) return state;
      if (choice.outcome === 'success') {
        return {
          screen: 'success',
          badge: state.badge,
          activity: state.activity,
        };
      }
      return { ...state, selectedChoice: choice.id, feedback: 'retry' };
    }
    case 'showHint':
      return state.screen === 'activity'
        ? { ...state, hintVisible: true }
        : state;
    case 'selectRepresentation':
      return state.screen === 'explore'
        ? { ...state, representation: action.representation }
        : state;
    case 'home':
      return state.screen === 'badges'
        ? state
        : { screen: 'home', badge: state.badge };
    case 'back':
      if (state.screen === 'badges') return state;
      return state.screen === 'home'
        ? initialPrototypeState
        : { screen: 'home', badge: state.badge };
    case 'continue':
      return state.screen === 'success'
        ? { screen: 'home', badge: state.badge }
        : state;
  }
}
