import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  BadgeProfiles,
  ChildNavigation,
  ChildPracticeNotice,
  childShellCopy,
} from '../browser/phase3c/ChildShell';
import { SYNTHETIC_PROFILE_IDS } from '../../src/domain/adaptation/types';
import { SUPPORTED_LOCALES } from '../../src/presentation/localisation/locales';

describe('authored child shell — rendered review remains independent', () => {
  it.each(SUPPORTED_LOCALES)(
    'uses badge names and native direct buttons for %s',
    (locale) => {
      const copy = childShellCopy(locale);
      const html = renderToStaticMarkup(
        <BadgeProfiles
          locale={locale}
          selected={SYNTHETIC_PROFILE_IDS[0]}
          disabled={false}
          onChoose={() => undefined}
        />,
      );
      expect(html).toContain(`<span>${copy.star}</span>`);
      expect(html).toContain(`<span>${copy.triangle}</span>`);
      expect(html.match(/<button /gu)).toHaveLength(2);
      expect(html.match(/aria-pressed="true"/gu)).toHaveLength(1);
      expect(html).toContain('aria-labelledby="profiles-heading"');
      expect(html).not.toMatch(
        /Synthetic player|Συνθετικός παίκτης|Synthetische Spielfigur|<select|<input|data-developer-controls|<pre/,
      );
      expect(html.match(/aria-hidden="true"/gu)).toHaveLength(2);
    },
  );

  it('offers three clear destinations rather than an engineering family catalog', () => {
    const html = renderToStaticMarkup(
      <ChildNavigation
        locale="en-GB"
        active="shapes"
        disabled={false}
        onNavigate={() => undefined}
      />,
    );
    expect(html.match(/<button /gu)).toHaveLength(3);
    expect(html).toContain('>Play</button>');
    expect(html).toContain('>Shapes</button>');
    expect(html).toContain('>Explore</button>');
    expect(html).toContain('data-child-nav="shapes" aria-pressed="true"');
    expect(html).not.toMatch(/<select|<input|data-family|quadrilateral/);
  });

  it('keeps manual and exploration evidence wording honest', () => {
    const manual = renderToStaticMarkup(
      <ChildPracticeNotice locale="en-GB" exploration={false} manual />,
    );
    const exploration = renderToStaticMarkup(
      <ChildPracticeNotice locale="en-GB" exploration manual={false} />,
    );
    const practice = renderToStaticMarkup(
      <ChildPracticeNotice locale="en-GB" exploration={false} manual={false} />,
    );
    expect(manual).toContain('Answers do not count towards learning progress.');
    expect(exploration).toContain(
      'Answers do not count towards learning progress.',
    );
    expect(practice).toContain('Take your time.');
    expect(practice).not.toMatch(/mastery|classified|expert|level|score/);
  });
});
