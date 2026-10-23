import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { syntheticLoopTaskSeed } from '../../src/application/synthetic-loop';
import { SYNTHETIC_PROFILE_IDS } from '../../src/domain/adaptation/types';
import {
  CHILD_PICTURES,
  childPictureFor,
} from '../../src/ui/synthetic-loop/child-pictures';

const css = readFileSync('src/ui/synthetic-loop/child-task.css', 'utf8');

function rgb(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
/** WCAG 2.2 relative luminance of an sRGB colour. */
function luminance([r, g, b]: readonly [number, number, number]): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
function contrast(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}
/** Browsers blend opacity in encoded sRGB, channel by channel. */
function over(
  colour: readonly [number, number, number],
  background: readonly [number, number, number],
  alpha: number,
): readonly [number, number, number] {
  return [0, 1, 2].map(
    (index) =>
      alpha * (colour[index] ?? 0) + (1 - alpha) * (background[index] ?? 0),
  ) as unknown as readonly [number, number, number];
}

describe('counted pictures', () => {
  it('declares a tint for every drawn picture and keeps the mint dot', () => {
    for (const picture of CHILD_PICTURES.filter((item) => item !== 'dot'))
      expect(css).toMatch(
        new RegExp(`\\.child-picture-${picture} \\{\\s*color: #[0-9a-f]{6};`),
      );
    expect(css).toMatch(/\.child-task \.child-token \{[^}]*color: #b6f4dc;/);
  });

  it('keeps at least 4.5:1 on every panel, also crossed out or disabled', () => {
    const tints = [
      '#b6f4dc',
      ...[
        ...css.matchAll(/\.child-picture-\w+ \{\s*color: (#[0-9a-f]{6});/g),
      ].map((match) => match[1] ?? ''),
    ];
    expect(tints).toHaveLength(CHILD_PICTURES.length);
    // Task panel, token buttons/cards, page shell.
    for (const background of ['#102542', '#173057', '#07152d'])
      for (const tint of tints)
        for (const alpha of [1, 0.7, 0.65]) {
          const ground = rgb(background);
          expect(
            contrast(over(rgb(tint), ground, alpha), ground),
            `${tint} at ${alpha} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
  });

  it('picks one stable picture per task and every picture appears evenly', () => {
    const counts = new Map<string, number>();
    for (const profile of SYNTHETIC_PROFILE_IDS)
      for (let ordinal = 1; ordinal <= 1000; ordinal++) {
        const seed = syntheticLoopTaskSeed(profile, 'number.counting', ordinal);
        if (!seed.ok) throw new Error('seed');
        const picture = childPictureFor(seed.value);
        expect(childPictureFor(seed.value)).toBe(picture);
        counts.set(picture, (counts.get(picture) ?? 0) + 1);
      }
    expect([...counts.keys()].sort()).toEqual([...CHILD_PICTURES].sort());
    for (const count of counts.values()) {
      expect(count / 2000).toBeGreaterThan(0.15);
      expect(count / 2000).toBeLessThan(0.25);
    }
  });

  it('falls back to dots for anything that is not a task seed', () => {
    for (const input of [undefined, '', 'zz', '0'.repeat(31), 'A'.repeat(32)])
      expect(childPictureFor(input)).toBe('dot');
  });
});
