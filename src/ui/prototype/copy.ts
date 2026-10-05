import { getPrototypeCopy } from '../../presentation/localisation/format';
import type { PrototypeLanguage } from './options';
import type { PrototypeCopy } from '../../presentation/localisation/messages';

export { getPrototypeCopy } from '../../presentation/localisation/format';
export type { PrototypeCopy } from '../../presentation/localisation/messages';

/** Compatibility view of the complete current-prototype drafts, never official packs. */
export const prototypeCopy: Readonly<Record<PrototypeLanguage, PrototypeCopy>> =
  {
    el: getPrototypeCopy('el-GR'),
    en: getPrototypeCopy('en-GB'),
    de: getPrototypeCopy('de-DE'),
  };
