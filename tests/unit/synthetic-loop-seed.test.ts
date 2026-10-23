import { describe, expect, it } from 'vitest';
import {
  syntheticLoopTaskSeed,
  syntheticLoopTaskSeedV1,
  SYNTHETIC_LOOP_SEED_VERSION,
  SYNTHETIC_LOOP_SEED_VERSION_V1,
  SYNTHETIC_LOOP_SEED_VERSIONS,
} from '../../src/application/synthetic-loop';
import { createChapterTask } from '../../src/application/growing-world';
import { createFamilyProof } from '../../src/application/family-proof';
import { createSliceFamily } from '../../src/application/slice-family';
import { SYNTHETIC_PROFILE_IDS } from '../../src/domain/adaptation/types';
import {
  createProofReplay,
  generateProof,
  PROOF_FAMILY_IDS,
} from '../../src/domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../src/domain/families/slice';
import { CHAPTER_FAMILY_IDS } from '../../src/domain/growing-world/content';

const FAMILIES = [
  ...PROOF_FAMILY_IDS,
  ...SLICE_FAMILY_IDS,
  ...CHAPTER_FAMILY_IDS,
] as const;
const MODULUS = 1n << 32n;

/** Independent oracle: the MurmurHash3 finalizer in exact BigInt arithmetic. */
function oracleMix(input: bigint): bigint {
  let value = input % MODULUS;
  value ^= value >> 16n;
  value = (value * 0x85ebca6bn) % MODULUS;
  value ^= value >> 13n;
  value = (value * 0xc2b2ae35n) % MODULUS;
  value ^= value >> 16n;
  return value;
}

function oracleSeed(
  profileIndex: number,
  familyIndex: number,
  ordinal: number,
) {
  const key =
    BigInt(ordinal) +
    (BigInt(familyIndex + 1) << 20n) +
    (BigInt(profileIndex) << 24n);
  return [1n, 2n, 3n, 4n]
    .map((lane) =>
      oracleMix(key + lane * 0x9e3779b9n)
        .toString(16)
        .padStart(8, '0'),
    )
    .join('');
}

function seedOf(
  profile: (typeof SYNTHETIC_PROFILE_IDS)[number],
  family: (typeof FAMILIES)[number],
  ordinal: number,
): string {
  const seed = syntheticLoopTaskSeed(profile, family, ordinal);
  if (!seed.ok) throw new Error(`no seed for ${family}#${ordinal}`);
  return seed.value;
}

/** A child's realistic run of one activity: tasks 1..n of the session. */
function session<T>(
  family: (typeof FAMILIES)[number],
  read: (seed: string) => T,
  length = 30,
): readonly T[] {
  return SYNTHETIC_PROFILE_IDS.flatMap((profile) =>
    Array.from({ length }, (_, index) =>
      read(seedOf(profile, family, index + 1)),
    ),
  );
}

function slice(family: (typeof SLICE_FAMILY_IDS)[number], seed: string) {
  const result = createSliceFamily(family, seed);
  if (!result.ok) throw new Error('slice generation failed');
  return result.value.task;
}

function chapter(family: (typeof CHAPTER_FAMILY_IDS)[number], seed: string) {
  const result = createChapterTask(family, seed);
  if (!result.ok) throw new Error('chapter generation failed');
  return result.value.task;
}

const share = (values: readonly boolean[]) =>
  values.filter(Boolean).length / values.length;

describe('versioned synthetic workflow seed selection', () => {
  it('keeps the frozen v1 selection under its own version', () => {
    expect(SYNTHETIC_LOOP_SEED_VERSION_V1).toBe('phase3c-session-seeds-v1');
    expect(SYNTHETIC_LOOP_SEED_VERSIONS).toEqual([
      'phase3c-session-seeds-v1',
      'phase3c-session-seeds-v2',
    ]);
    const families = [...PROOF_FAMILY_IDS, ...SLICE_FAMILY_IDS];
    for (const [profileIndex, profile] of SYNTHETIC_PROFILE_IDS.entries())
      for (const [index, family] of families.entries())
        for (const ordinal of [0, 1, 2, 65535, 999999, 1000000]) {
          const mixed =
            ((BigInt(ordinal) * 0x9e3779b9n) % MODULUS) ^
            (profileIndex === 0 ? 0xa341316cn : 0xc8013ea4n) ^
            ((BigInt(index + 1) * 0xad90777dn) % MODULUS);
          const expected = [
            BigInt(ordinal),
            mixed,
            BigInt(index + 1),
            0x9e3779b9n,
          ]
            .map((word) => word.toString(16).padStart(8, '0'))
            .join('');
          expect(syntheticLoopTaskSeedV1(profile, family, ordinal)).toEqual({
            ok: true,
            value: expected,
          });
        }
  });

  it('documents the v1 defect: a second draw copied the first', () => {
    for (const profile of SYNTHETIC_PROFILE_IDS)
      for (let ordinal = 1; ordinal <= 24; ordinal++) {
        const seed = syntheticLoopTaskSeedV1(
          profile,
          'number.comparison',
          ordinal,
        );
        expect(seed.ok).toBe(true);
        if (!seed.ok) continue;
        const task = slice('number.comparison', seed.value);
        expect(
          task.kind === 'compareQuantities' &&
            task.left.length === task.right.length,
        ).toBe(true);
      }
  });

  it('matches an independent BigInt oracle for every family and boundary', () => {
    expect(SYNTHETIC_LOOP_SEED_VERSION).toBe('phase3c-session-seeds-v2');
    for (const [profileIndex, profile] of SYNTHETIC_PROFILE_IDS.entries())
      for (const [index, family] of FAMILIES.entries())
        for (const ordinal of [0, 1, 2, 3, 65535, 524288, 999999, 1000000])
          expect(syntheticLoopTaskSeed(profile, family, ordinal)).toEqual({
            ok: true,
            value: oracleSeed(profileIndex, index, ordinal),
          });
  });

  it('pins literal v2 seeds, so reordering families or badges cannot change them under the same ID', () => {
    // The key holds one badge bit; a third badge would need a new version.
    expect(SYNTHETIC_PROFILE_IDS).toEqual([
      'SYNTHETIC-PLAYER-1',
      'SYNTHETIC-PLAYER-2',
    ]);
    const golden = [
      [
        'number.addition',
        '31eacbcdfb88bc0dfa02d5eedc7af590',
        '80abbd7d3795a08101b94aa98834f15a',
      ],
      [
        'geometry.quadrilateral',
        'b5e36e0325b4501bdcfc1c4630fc9814',
        '954f49a07002a15ceb52632c7a459352',
      ],
      [
        'measurement.unit-length',
        '81b25d2b02f7915f7a3a5331cca11dfa',
        '9ca6f3ae1820a4ccbb05716a75cf2286',
      ],
      [
        'number.numeral',
        'd5903a828dd6cbb74652d819bda7dee3',
        '90d81a4e9e02a887bbb43ea4c8faa468',
      ],
      [
        'number.counting',
        'b66e0bd3e1ec768302ea5162e848094c',
        'f70ec42fd4f19b8f9a7361d2215d4baf',
      ],
      [
        'number.comparison',
        '419a678cd0371f7fa4e0edf4c1eb18c6',
        'ebb0188afa4c073b02befb2de9bb31d0',
      ],
      [
        'number.subtraction',
        '0deb2e8ffafd6d5ccaafc12ac619217b',
        'd6185dcb31dd9d4d234bc83b7f182448',
      ],
      [
        'number.missing',
        'c4c4e29943991ba37eaa0cef52ecbf17',
        'bac379ef10136dcd5618627da731ccd8',
      ],
      [
        'number.make-ten',
        '6c9416302d7cc1cf3cdfeb688ddd4146',
        'b44976c1e8b98d0ebb8830ea9375c1fc',
      ],
      [
        'number.part-whole',
        '13864f54c4a365b319b4843136a3d15a',
        'ce61ca806f57f3e8f481fe313b768ff1',
      ],
      [
        'groups.equal',
        '1c37223c34a96ea010889d8a83e7345e',
        'b09abe608221f06c4749bd88e81a5dbd',
      ],
      [
        'groups.missing',
        '733445506187da458ad688948ffb59d9',
        '6ee8899b629b147d02d17ed0e75ebb4e',
      ],
      [
        'measurement.array-area',
        'ff5d4eb23b0399d3d4f692a54824e473',
        'ff5a287c4174a4ab95e249d1f4d77e92',
      ],
      [
        'powers.square-side',
        '90e9bb81e5a0000934a48cc5ca6b5b0b',
        '017c94a8b2b88b6012cdc98ca7987506',
      ],
    ] as const;
    expect(golden.map(([family]) => family)).toEqual([...FAMILIES]);
    for (const [family, star, triangle] of golden) {
      expect(seedOf('SYNTHETIC-PLAYER-1', family, 1)).toBe(star);
      expect(seedOf('SYNTHETIC-PLAYER-2', family, 1)).toBe(triangle);
    }
  });

  it('gives every badge, family and ordinal its own nonzero, distinct-word state', () => {
    const seen = new Set<string>();
    for (const profile of SYNTHETIC_PROFILE_IDS)
      for (const family of FAMILIES)
        for (let ordinal = 0; ordinal <= 400; ordinal++) {
          const seed = seedOf(profile, family, ordinal);
          const words = seed.match(/.{8}/g) ?? [];
          expect(new Set(words).size).toBe(4);
          expect(words.some((word) => word !== '00000000')).toBe(true);
          seen.add(seed);
        }
    expect(seen.size).toBe(
      SYNTHETIC_PROFILE_IDS.length * FAMILIES.length * 401,
    );
  });

  it.each([-1, 1000001, 1.5, NaN, Infinity])(
    'refuses an unsupported ordinal %s',
    (ordinal) => {
      for (const select of [syntheticLoopTaskSeed, syntheticLoopTaskSeedV1])
        expect(select('SYNTHETIC-PLAYER-1', 'number.numeral', ordinal)).toEqual(
          { ok: false, error: { code: 'invalid_command' } },
        );
    },
  );
});

describe('a session of any activity varies', () => {
  it('reaches every numeral and counting quantity', () => {
    for (const family of ['number.numeral', 'number.counting'] as const) {
      const quantities = new Set(
        session(family, (seed) => {
          const task = slice(family, seed);
          return task.kind === 'numeralRecognition'
            ? Number(task.numeral.numerator)
            : task.kind === 'countItems'
              ? task.items.length
              : -1;
        }),
      );
      expect([...quantities].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('shows more left, more right and equal groups to compare', () => {
    const pairs = session('number.comparison', (seed) => {
      const task = slice('number.comparison', seed);
      if (task.kind !== 'compareQuantities') throw new Error('kind');
      return [task.left.length, task.right.length] as const;
    });
    const less = share(pairs.map(([l, r]) => l < r));
    const equal = share(pairs.map(([l, r]) => l === r));
    const greater = share(pairs.map(([l, r]) => l > r));
    expect(less).toBeGreaterThan(0.25);
    expect(greater).toBeGreaterThan(0.25);
    expect(equal).toBeGreaterThan(0);
    expect(equal).toBeLessThan(0.34);
  });

  it('matches the generator distribution of relations over a long run', () => {
    const relations = { less: 0, equal: 0, greater: 0 };
    for (const profile of SYNTHETIC_PROFILE_IDS)
      for (let ordinal = 1; ordinal <= 1200; ordinal++) {
        const task = slice(
          'number.comparison',
          seedOf(profile, 'number.comparison', ordinal),
        );
        if (task.kind !== 'compareQuantities') throw new Error('kind');
        relations[
          task.left.length < task.right.length
            ? 'less'
            : task.left.length > task.right.length
              ? 'greater'
              : 'equal'
        ] += 1;
      }
    // Two independent uniform draws in 0..5: 15/36, 6/36, 15/36.
    expect(relations.less / 2400).toBeCloseTo(15 / 36, 1);
    expect(relations.equal / 2400).toBeCloseTo(6 / 36, 1);
    expect(relations.greater / 2400).toBeCloseTo(15 / 36, 1);
  });

  it('takes away different amounts, not only none or everything', () => {
    const cases = session('number.subtraction', (seed) => {
      const task = slice('number.subtraction', seed);
      if (task.kind !== 'subtractItems') throw new Error('kind');
      return [task.items.length, task.removedIds.length] as const;
    });
    // v1 reached 0.10 here; the generator's exact long-run rate is 0.35.
    expect(share(cases.map(([w, r]) => r > 0 && r < w))).toBeGreaterThan(0.2);
    expect(new Set(cases.map(([w, r]) => w - r)).size).toBe(6);
  });

  it('matches the generator rate of partial take-aways over a long run', () => {
    let partial = 0;
    for (const profile of SYNTHETIC_PROFILE_IDS)
      for (let ordinal = 1; ordinal <= 1200; ordinal++) {
        const task = slice(
          'number.subtraction',
          seedOf(profile, 'number.subtraction', ordinal),
        );
        if (task.kind !== 'subtractItems') throw new Error('kind');
        if (
          task.removedIds.length > 0 &&
          task.removedIds.length < task.items.length
        )
          partial += 1;
      }
    // Whole w uniform in 0..5, removed uniform in 0..w: mean (w-1)/(w+1) = 0.35.
    expect(partial / 2400).toBeCloseTo(0.35, 1);
  });

  it('hides different parts with unequal addends', () => {
    const cases = session('number.missing', (seed) => {
      const task = slice('number.missing', seed);
      if (task.kind !== 'missingNumber') throw new Error('kind');
      const total = Number(task.total?.numerator ?? NaN);
      const left = Number(
        task.left?.numerator ?? total - Number(task.right?.numerator),
      );
      const right = Number(task.right?.numerator ?? total - left);
      return { left, right, position: task.unknownPosition };
    });
    expect(share(cases.map((c) => c.left !== c.right))).toBeGreaterThan(0.6);
    expect(new Set(cases.map((c) => c.position)).size).toBe(3);
  });

  it('adds unequal numbers to many different totals', () => {
    const sums = session('number.addition', (seed) => {
      const result = createFamilyProof('number.addition', seed);
      if (!result.ok || result.value.task.kind !== 'evaluateExpression')
        throw new Error('addition');
      const root = result.value.task.expression.root;
      if (
        root.kind !== 'add' ||
        root.left.kind !== 'literal' ||
        root.right.kind !== 'literal'
      )
        throw new Error('shape');
      return [
        Number(root.left.value.numerator),
        Number(root.right.value.numerator),
      ] as const;
    });
    expect(share(sums.map(([a, b]) => a !== b))).toBeGreaterThan(0.6);
    expect(new Set(sums.map(([a, b]) => a + b)).size).toBeGreaterThanOrEqual(8);
  });

  it('shows squares, rectangles and parallelograms', () => {
    const kinds = new Set(
      session('geometry.quadrilateral', (seed) => {
        const replay = createProofReplay('geometry.quadrilateral', seed);
        if (!replay.ok) throw new Error('replay');
        const instance = generateProof(replay.value);
        if (
          !instance.ok ||
          instance.value.answerContract.kind !== 'classification'
        )
          throw new Error('quadrilateral');
        return [...instance.value.answerContract.expectedClassIds]
          .sort()
          .join('+');
      }),
    );
    expect(kinds).toEqual(
      new Set([
        'geometry.parallelogram',
        'geometry.parallelogram+geometry.rectangle',
        'geometry.parallelogram+geometry.rectangle+geometry.square',
      ]),
    );
  });

  it('measures lines of many lengths', () => {
    const lengths = new Set(
      session('measurement.unit-length', (seed) => {
        const result = createFamilyProof('measurement.unit-length', seed);
        if (!result.ok) throw new Error('length');
        return result.value.units?.length ?? 0;
      }),
    );
    expect(lengths.size).toBeGreaterThanOrEqual(6);
  });

  it('varies every chapter activity beyond doubles and squares', () => {
    const makeTen = session('number.make-ten', (seed) => {
      const task = chapter('number.make-ten', seed);
      if (task.kind !== 'makeTen') throw new Error('kind');
      return task.first !== task.second;
    });
    expect(share(makeTen)).toBeGreaterThan(0.6);
    const partWhole = session('number.part-whole', (seed) => {
      const task = chapter('number.part-whole', seed);
      if (task.kind !== 'missingPart') throw new Error('kind');
      return `${task.known}/${task.total}/${task.unknownPosition}`;
    });
    expect(new Set(partWhole).size).toBeGreaterThan(30);
    const groups = session('groups.equal', (seed) => {
      const task = chapter('groups.equal', seed);
      if (task.kind !== 'equalGroups') throw new Error('kind');
      return task.groups !== task.each;
    });
    expect(share(groups)).toBeGreaterThan(0.5);
    const missingGroups = session('groups.missing', (seed) => {
      const task = chapter('groups.missing', seed);
      if (task.kind !== 'missingGroup') throw new Error('kind');
      return task.total !== task.groups * task.groups;
    });
    expect(share(missingGroups)).toBeGreaterThan(0.5);
    const arrays = session('measurement.array-area', (seed) => {
      const task = chapter('measurement.array-area', seed);
      if (task.kind !== 'arrayArea') throw new Error('kind');
      return task.rows !== task.columns;
    });
    expect(share(arrays)).toBeGreaterThan(0.5);
    const squares = new Set(
      session('powers.square-side', (seed) => {
        const task = chapter('powers.square-side', seed);
        if (task.kind !== 'squareSide') throw new Error('kind');
        return task.total;
      }),
    );
    expect(squares.size).toBeGreaterThanOrEqual(4);
  });

  it('changes the task from one example to the next', () => {
    for (const family of FAMILIES) {
      const tasks = session(family, (seed) =>
        JSON.stringify(
          (CHAPTER_FAMILY_IDS as readonly string[]).includes(family)
            ? chapter(family as (typeof CHAPTER_FAMILY_IDS)[number], seed)
            : (SLICE_FAMILY_IDS as readonly string[]).includes(family)
              ? slice(family as (typeof SLICE_FAMILY_IDS)[number], seed)
              : (() => {
                  const result = createFamilyProof(
                    family as (typeof PROOF_FAMILY_IDS)[number],
                    seed,
                  );
                  return result.ok ? result.value.task : null;
                })(),
        ),
      );
      const repeats = tasks.filter(
        (task, index) => index % 30 !== 0 && task === tasks[index - 1],
      ).length;
      // Small task spaces may repeat by chance (v2 at most 0.167 here), never
      // as the usual pattern (v1 reached 0.267).
      expect(repeats / tasks.length).toBeLessThan(0.2);
    }
  });
});
