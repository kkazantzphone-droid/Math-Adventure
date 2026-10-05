/** Fixed visual-UAT demonstrations only. Never use these as production math truth. */
export type PrototypeOutcome = 'retry' | 'success';
export type PrototypeActivity = 'number' | 'shape';
export type PrototypeShape = 'triangle' | 'square' | 'rectangle';
export type PrototypeRepresentation = 'multiply' | 'square' | 'root';

export interface PrototypeChoice {
  readonly id: string;
  readonly display: string;
  readonly outcome: PrototypeOutcome;
  readonly shape?: PrototypeShape;
}

export interface PrototypeScenario {
  readonly id: PrototypeActivity;
  readonly display: string;
  readonly choices: readonly PrototypeChoice[];
}

// Outcomes are scripted. There is no generator, arithmetic/shape validator or evidence.
export const prototypeScenarios: Readonly<
  Record<PrototypeActivity, PrototypeScenario>
> = {
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
      { id: 'square', display: 'square', shape: 'square', outcome: 'success' },
      {
        id: 'rectangle',
        display: 'rectangle',
        shape: 'rectangle',
        outcome: 'retry',
      },
    ],
  },
};

export const prototypeRepresentations: readonly {
  readonly id: PrototypeRepresentation;
  readonly display: string;
}[] = [
  { id: 'multiply', display: '4 × 4 = 16' },
  { id: 'square', display: '4² = 16' },
  { id: 'root', display: '√16 = 4' },
];

// Explicit static cells/groups, not generated mathematical content.
export const prototypeArrayCells = [
  'a1',
  'a2',
  'a3',
  'a4',
  'b1',
  'b2',
  'b3',
  'b4',
  'c1',
  'c2',
  'c3',
  'c4',
  'd1',
  'd2',
  'd3',
  'd4',
] as const;
export const prototypeDotGroups = [
  ['a', 'b', 'c'],
  ['d', 'e'],
] as const;
