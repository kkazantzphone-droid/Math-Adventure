import { PrototypeExperience } from './prototype/PrototypeExperience';
import type { PrototypeLanguage } from './prototype/options';

export function App({
  language = 'el',
}: {
  readonly language?: PrototypeLanguage;
} = {}) {
  return <PrototypeExperience language={language} />;
}
