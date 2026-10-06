import type { SyntheticProfileId } from '../../../src/domain/adaptation/types';
import { SYNTHETIC_PROFILE_IDS } from '../../../src/domain/adaptation/types';
import {
  resolvePrototypeLocale,
  type Locale,
} from '../../../src/presentation/localisation/locales';

// Draft presentation copy only. Fixed badge identities are never learner names.
const copies = {
  'el-GR': {
    chooseBadge: 'Διάλεξε το σήμα σου',
    star: 'Αστέρι',
    triangle: 'Τρίγωνο',
    play: 'Παίξε',
    shapes: 'Σχήματα',
    explore: 'Εξερεύνησε',
    grownUps: 'Για μεγάλους',
    childView: 'Πίσω στο παιχνίδι',
    anotherActivity: 'Κάτι άλλο',
    listen: 'Άκου',
    stopListening: 'Ησυχία',
    justPlay: 'Παίζουμε. Οι απαντήσεις δεν μετρούν στη μαθησιακή πρόοδο.',
    exploration: 'Εξερευνούμε. Οι απαντήσεις δεν μετρούν στη μαθησιακή πρόοδο.',
    practice: 'Δοκίμασε με την ησυχία σου.',
    navigation: 'Πού θέλεις να πας;',
    wait: 'Μια στιγμή. Το παιχνίδι ανοίγει ξανά.',
    askGrownUp: 'Ζήτησε βοήθεια από έναν μεγάλο.',
  },
  'en-GB': {
    chooseBadge: 'Choose your badge',
    star: 'Star',
    triangle: 'Triangle',
    play: 'Play',
    shapes: 'Shapes',
    explore: 'Explore',
    grownUps: 'Grown-ups',
    childView: 'Back to play',
    anotherActivity: 'Something else',
    listen: 'Listen',
    stopListening: 'Quiet',
    justPlay: 'Just play. Answers do not count towards learning progress.',
    exploration: 'Explore. Answers do not count towards learning progress.',
    practice: 'Take your time.',
    navigation: 'Where would you like to go?',
    wait: 'One moment. The game is opening again.',
    askGrownUp: 'Ask a grown-up for help.',
  },
  'de-DE': {
    chooseBadge: 'Wähle dein Zeichen',
    star: 'Stern',
    triangle: 'Dreieck',
    play: 'Spielen',
    shapes: 'Formen',
    explore: 'Entdecken',
    grownUps: 'Für Erwachsene',
    childView: 'Zurück zum Spiel',
    anotherActivity: 'Etwas anderes',
    listen: 'Anhören',
    stopListening: 'Ruhe',
    justPlay: 'Einfach spielen. Antworten zählen nicht zum Lernfortschritt.',
    exploration: 'Entdecken. Antworten zählen nicht zum Lernfortschritt.',
    practice: 'Lass dir Zeit.',
    navigation: 'Wohin möchtest du gehen?',
    wait: 'Einen Moment. Das Spiel wird wieder geöffnet.',
    askGrownUp: 'Bitte eine erwachsene Person um Hilfe.',
  },
} as const;

export function childShellCopy(locale: Locale) {
  return copies[resolvePrototypeLocale(locale).effectiveLocale];
}

export type ChildDestination = 'play' | 'shapes' | 'explore';

function Badge({ kind }: { readonly kind: 'star' | 'triangle' }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {kind === 'star' ? (
        <polygon points="50,8 61,36 91,38 68,58 76,88 50,71 24,88 32,58 9,38 39,36" />
      ) : (
        <polygon points="50,10 92,86 8,86" />
      )}
    </svg>
  );
}

export function BadgeProfiles({
  locale,
  selected,
  disabled,
  onChoose,
}: {
  readonly locale: Locale;
  readonly selected: SyntheticProfileId | null;
  readonly disabled: boolean;
  readonly onChoose: (profile: SyntheticProfileId) => void;
}) {
  const copy = childShellCopy(locale);
  return (
    <section className="child-profiles" aria-labelledby="profiles-heading">
      <h2 id="profiles-heading">{copy.chooseBadge}</h2>
      <div className="child-badge-choices">
        {SYNTHETIC_PROFILE_IDS.map((profile, index) => {
          const kind = index === 0 ? 'star' : 'triangle';
          return (
            <button
              key={profile}
              type="button"
              data-profile={profile}
              className="child-badge"
              aria-pressed={selected === profile}
              disabled={disabled}
              onClick={() => onChoose(profile)}
            >
              <Badge kind={kind} />
              <span>{copy[kind]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ChildNavigation({
  locale,
  active,
  disabled,
  onNavigate,
}: {
  readonly locale: Locale;
  readonly active: ChildDestination;
  readonly disabled: boolean;
  readonly onNavigate: (destination: ChildDestination) => void;
}) {
  const copy = childShellCopy(locale);
  return (
    <nav className="child-navigation" aria-label={copy.navigation}>
      {(['play', 'shapes', 'explore'] as const).map((destination) => (
        <button
          key={destination}
          type="button"
          data-child-nav={destination}
          aria-pressed={active === destination}
          disabled={disabled}
          onClick={() => onNavigate(destination)}
        >
          <span aria-hidden="true">
            {destination === 'play'
              ? '▶'
              : destination === 'shapes'
                ? '◇'
                : '✦'}
          </span>
          {copy[destination]}
        </button>
      ))}
    </nav>
  );
}

export function ChildPracticeNotice({
  locale,
  exploration,
  manual,
}: {
  readonly locale: Locale;
  readonly exploration: boolean;
  readonly manual: boolean;
}) {
  const copy = childShellCopy(locale);
  return (
    <p className="child-practice-notice" data-child-evidence-mode>
      {exploration ? copy.exploration : manual ? copy.justPlay : copy.practice}
    </p>
  );
}
