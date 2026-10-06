import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createFamilyProof } from '../../src/application/family-proof';
import type { ProofFamilyId } from '../../src/application/family-proof';
import { parseLanguagePreferences } from '../../src/presentation/localisation';
import { FamilyProofScreen } from '../../src/ui/family-proof/FamilyProofScreen';
import type { FamilyProofScreenProps } from '../../src/ui/family-proof/FamilyProofScreen';

interface ElementInfo {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly language: string;
  readonly text: string;
  readonly hidden: boolean;
  readonly live: boolean;
}

function plainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join('');
  if (!isValidElement<{ readonly children?: ReactNode }>(node)) return '';
  return plainText(node.props.children);
}

function elements(node: ReactNode): readonly ElementInfo[] {
  const result: ElementInfo[] = [];
  function visit(
    child: ReactNode,
    inheritedLanguage = '',
    inheritedHidden = false,
    inheritedLive = false,
  ): void {
    if (!isValidElement<Record<string, unknown>>(child)) return;
    const props = child.props;
    const language =
      typeof props.lang === 'string' ? props.lang : inheritedLanguage;
    const hidden = inheritedHidden || props.hidden === true;
    const live =
      props['aria-live'] === 'off'
        ? false
        : inheritedLive ||
          props.role === 'status' ||
          props.role === 'alert' ||
          props['aria-live'] === 'polite' ||
          props['aria-live'] === 'assertive';
    result.push({
      type: child.type,
      props,
      language,
      text: plainText(props.children as ReactNode),
      hidden,
      live,
    });
    Children.forEach(props.children as ReactNode, (nested) =>
      visit(nested, language, hidden, live),
    );
  }
  visit(node);
  return result;
}

function screenProps(familyId: ProofFamilyId): FamilyProofScreenProps {
  const seedHex = 'ffffffffffffffffffffffffffffffff';
  const proof = createFamilyProof(familyId, seedHex);
  if (!proof.ok) throw new Error(proof.error.code);
  return {
    proof: proof.value,
    familyId,
    seedHex,
    preferences: parseLanguagePreferences('?lang=en'),
    response: '',
    selectedClasses: [],
    hintVisible: false,
    unitIndex: -1,
    feedback: 'none',
    onFamily: () => undefined,
    onSeed: () => undefined,
    onReplay: () => undefined,
    onResponse: () => undefined,
    onClass: () => undefined,
    onHint: () => undefined,
    onSubmit: () => undefined,
    onRetry: () => undefined,
    onNextUnit: () => undefined,
    onStartUnits: () => undefined,
  };
}

describe('independent family accessibility regressions', () => {
  it('keeps traversal UI controls in their effective language within mixed instructions', () => {
    for (const [ui, instruction, labels] of [
      ['el-GR', 'de-DE', ['Επόμενη μονάδα', 'Από την αρχή']],
      ['en-GB', 'el-GR', ['Next unit step', 'Start again']],
      ['de-DE', 'en-GB', ['Nächster Einheitsschritt', 'Von vorn beginnen']],
    ] as const) {
      const nodes = elements(
        FamilyProofScreen({
          ...screenProps('measurement.unit-length'),
          preferences: parseLanguagePreferences(
            `?ui=${ui}&instruction=${instruction}&speech=fr-FR`,
          ),
        }),
      );
      for (const label of labels) {
        const control = nodes.find(
          (node) => node.type === 'button' && node.text === label,
        );
        expect(control, label).toBeDefined();
        expect(control?.language, label).toBe(ui);
      }
      expect(
        nodes.find((node) => node.props.id === 'proof-unit-step')?.language,
      ).toBe(instruction);
    }
  });

  it('exposes each unit traversal update for announcement without giving away a total', () => {
    const baseline = screenProps('measurement.unit-length');
    const length = baseline.proof?.units?.length;
    expect(length).toBe(8);
    for (const [unitIndex, expected] of [
      [-1, 'Beginning of the length'],
      [0, 'One unit step: A → B'],
      [7, 'One unit step: H → I'],
      [8, 'End of the length'],
    ] as const) {
      const nodes = elements(FamilyProofScreen({ ...baseline, unitIndex }));
      const liveContainers = nodes.filter(
        (node) =>
          typeof node.type === 'string' &&
          (node.props.role === 'status' ||
            node.props['aria-live'] === 'polite'),
      );
      expect(liveContainers).toHaveLength(2);
      expect(
        liveContainers.filter((node) => node.text.includes(expected)),
      ).toHaveLength(1);
      expect(
        nodes.some(
          (node) =>
            node.type === 'button' &&
            typeof node.props['aria-describedby'] === 'string' &&
            node.props['aria-describedby']
              .split(' ')
              .includes('proof-unit-step'),
        ),
      ).toBe(false);
      expect(
        nodes.some(
          (node) => !node.hidden && node.live && node.text.includes(expected),
        ),
        expected,
      ).toBe(true);
      const announced = nodes
        .filter((node) => !node.hidden && node.live)
        .map((node) => node.text)
        .join(' ');
      expect(announced).not.toMatch(/\b8\b|eight|total|step\s+\d+\s+of\s+\d+/i);
    }
  });

  it('announces unavailable replay and associates the invalid seed with its recovery message', () => {
    const nodes = elements(
      FamilyProofScreen({
        ...screenProps('number.addition'),
        proof: null,
        seedHex: 'bad',
      }),
    );
    const message = 'The task is unavailable. Check the replay seed.';
    expect(
      nodes.some(
        (node) => !node.hidden && node.live && node.text.includes(message),
      ),
    ).toBe(true);
    const seed = nodes.find((node) => node.props.id === 'proof-seed');
    expect(seed?.props['aria-invalid']).toBe(true);
    const descriptions = seed?.props['aria-describedby'];
    expect(typeof descriptions).toBe('string');
    const ids = typeof descriptions === 'string' ? descriptions.split(' ') : [];
    expect(
      nodes.some(
        (node) => ids.includes(String(node.props.id)) && node.text === message,
      ),
    ).toBe(true);
  });
});
