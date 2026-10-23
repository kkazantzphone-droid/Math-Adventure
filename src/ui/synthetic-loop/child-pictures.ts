/** Things a child counts, compares or takes away. Presentation only: every
 * item in one task shares one picture, so only the quantity differs. No
 * picture copies a badge shape (Star, Triangle) the child chose above. */
export const CHILD_PICTURES = Object.freeze([
  'dot',
  'sun',
  'planet',
  'moon',
  'rocket',
] as const);
export type ChildPicture = (typeof CHILD_PICTURES)[number];

/** Choose from the task's public seed text, so a reopened task looks the same.
 * Neither truth, evidence, replay nor saved state reads this choice. */
export function childPictureFor(seedHex: string | undefined): ChildPicture {
  const word = /^[0-9a-f]{32}$/.test(seedHex ?? '')
    ? Number.parseInt((seedHex ?? '').slice(8, 16), 16)
    : 0;
  return CHILD_PICTURES[word % CHILD_PICTURES.length] ?? 'dot';
}
