import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OfflineSnapshot } from '../../src/presentation/offline/controller';
import { offlineCopy } from '../../src/presentation/offline/copy';
import { OfflineControls } from '../../src/ui/offline/OfflineControls';

const waiting: OfflineSnapshot = {
  shell: 'ready',
  update: 'waiting',
  frozen: false,
  safeBoundary: true,
  releaseId: 'synthetic-release',
};

function markup(snapshot = waiting) {
  return renderToStaticMarkup(
    <OfflineControls
      locale="en-GB"
      snapshot={snapshot}
      onUpdate={() => undefined}
    />,
  );
}

describe('offline readiness and deliberate adult update wording', () => {
  it('uses one update-status purpose and a warning associated only with the explicit action', () => {
    const rendered = markup();
    expect(rendered).toContain(
      'The complete offline shell is ready in this tab.',
    );
    expect(rendered).toContain(
      'Speech and saved learner progress have separate availability.',
    );
    expect(rendered).toContain(
      '<details><summary>Adult / developer update</summary>',
    );
    expect(rendered).toContain(
      'All tabs reload; the badge and screen selections restart.',
    );
    expect(rendered.match(/role="status"/g)).toHaveLength(1);
    expect(
      rendered.match(/aria-describedby="offline-update-warning"/g),
    ).toHaveLength(1);
    expect(rendered).not.toContain('disabled=""');
    expect(rendered).not.toContain('installed');
  });
  it.each([
    { ...waiting, safeBoundary: false },
    { ...waiting, frozen: true },
    { ...waiting, update: 'preparing' as const },
    { ...waiting, update: 'none' as const },
  ])(
    'withholds the action outside an unfrozen Home boundary with a complete waiting release',
    (snapshot) => {
      expect(markup(snapshot)).toContain('disabled=""');
    },
  );
  it('keeps its single frozen update explanation outside collapsed adult details', () => {
    const rendered = markup({ ...waiting, frozen: true, update: 'recovering' });
    const statusPosition = rendered.indexOf('role="status"');
    expect(statusPosition).toBeGreaterThan(0);
    expect(statusPosition).toBeLessThan(rendered.indexOf('<details inert="">'));
    expect(rendered.match(/role="status"/g)).toHaveLength(1);
    expect(rendered).toContain('data-frozen="true"');
    expect(rendered).toContain('tabindex="0"');
    expect(rendered).toContain('Controls pause until recovery.');
  });
  it.each(['el-GR', 'en-GB', 'de-DE'] as const)(
    'has draft coherent browser-state wording for %s',
    (locale) => {
      const copy = offlineCopy(locale);
      expect(copy.locale).toBe(locale);
      expect(Object.keys(copy.shell)).toEqual([
        'checking',
        'ready',
        'unavailable',
        'unsupported',
      ]);
      expect(Object.keys(copy.update)).toEqual([
        'none',
        'waiting',
        'preparing',
        'blocked',
        'recovering',
      ]);
      expect(copy.warning).not.toBe('');
      expect(copy.separate).not.toBe('');
    },
  );
  it('labels planned-language fallback with the effective written locale', () => {
    expect(offlineCopy('fr-FR').locale).toBe('el-GR');
  });
});
