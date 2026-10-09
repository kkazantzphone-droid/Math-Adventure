import type { LanguagePreferences } from '../../presentation/localisation/preferences';
import {
  PROTOTYPE_LOCALES,
  type PrototypeLocale,
} from '../../presentation/localisation/locales';
import {
  languageNames,
  languageControlCopy,
} from '../../presentation/localisation/language-controls-copy';

export function ChildLanguageControls({
  preferences,
  disabled,
  onChoose,
}: {
  readonly preferences: LanguagePreferences;
  readonly disabled: boolean;
  readonly onChoose: (locale: PrototypeLocale) => void;
}) {
  const words = languageControlCopy(preferences.uiLocale);
  const selected = PROTOTYPE_LOCALES.find(
    (locale) =>
      preferences.uiLocale === locale &&
      preferences.instructionLocale === locale &&
      preferences.numberSpeechLocale === locale,
  );
  return (
    <section className="child-languages" aria-labelledby="language-heading">
      <h2 id="language-heading">
        <span aria-hidden="true">◎ </span>
        {words.heading}
      </h2>
      <div className="child-language-choices">
        {PROTOTYPE_LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            lang={locale}
            data-child-language={locale}
            aria-pressed={selected === locale}
            disabled={disabled}
            onClick={() => onChoose(locale)}
          >
            {languageNames[locale]}
          </button>
        ))}
      </div>
      {(preferences.uiLocale !== preferences.instructionLocale ||
        preferences.uiLocale !== preferences.numberSpeechLocale) && (
        <p className="child-language-note">{words.mixed}</p>
      )}
    </section>
  );
}
