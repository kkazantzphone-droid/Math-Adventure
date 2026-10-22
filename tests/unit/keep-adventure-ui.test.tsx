import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  backupCopy,
  BACKUP_COPY_VERSION,
} from '../../src/presentation/localisation/backup-copy';
import type { BackupCopy } from '../../src/presentation/localisation/backup-copy';
import {
  BackupProfileSummary,
  BackupRestore,
} from '../../src/ui/synthetic-loop/BackupRestore';
import type { BackupRestoreActions } from '../../src/ui/synthetic-loop/BackupRestore';
import { syntheticBackupWorld } from '../fixtures/synthetic/keep-adventure';

const locales = ['el-GR', 'en-GB', 'de-DE'] as const;
const never = () => new Promise<never>(() => undefined);
const actions: BackupRestoreActions = {
  prepareBackup: never,
  inspectDestination: never,
  restore: never,
  checkRestore: never,
};

function shape(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(shape);
  if (input !== null && typeof input === 'object')
    return Object.fromEntries(
      Object.entries(input)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, nested]) => [key, shape(nested)]),
    );
  return typeof input;
}
function strings(input: unknown): string[] {
  if (typeof input === 'string') return [input];
  if (input !== null && typeof input === 'object')
    return Object.values(input).flatMap(strings);
  return [];
}

describe(
  'Keep my adventure — authored adult drafts and markup',
  { timeout: 30_000 },
  () => {
    it('has complete, distinct Greek, British English and German drafts', () => {
      expect(BACKUP_COPY_VERSION).toBe('keep-my-adventure-draft-v1');
      const english = backupCopy('en-GB');
      for (const locale of locales) {
        const copy = backupCopy(locale);
        expect(shape(copy)).toEqual(shape(english));
        const texts = strings(copy);
        expect(texts.every((text) => text.trim().length > 0)).toBe(true);
        expect(copy.contains).toHaveLength(4);
        expect(copy.excludes).toHaveLength(4);
        expect(copy.kinds).toHaveLength(4);
        if (locale === 'en-GB') continue;
        const translated = (text: string, index: number) =>
          text !== strings(english)[index];
        // Every sentence is authored, apart from the shared product name.
        expect(texts.filter((text, index) => !translated(text, index))).toEqual(
          [],
        );
        if (locale === 'el-GR')
          expect(texts.every((text) => /[Ͱ-Ͽ]/.test(text))).toBe(true);
      }
      // Planned locales resolve to the existing draft display fallback.
      expect(backupCopy('fr-FR')).toBe(backupCopy('el-GR'));
    });

    it('states the backup boundaries truthfully in every draft', () => {
      const english: BackupCopy = backupCopy('en-GB');
      expect(english.checksum).toMatch(/not a password, encryption or proof/);
      expect(english.privacy).toMatch(/cannot delete copies/);
      expect(english.saveRequested).toMatch(/asked to save/);
      expect(english.saveRequested).not.toMatch(/\bsaved safely\b/);
      expect(english.restoreIntro).toMatch(/never replaces or mixes/);
      expect(english.excludes.join(' ')).toMatch(/Explore is never saved/);
      expect(english.kinds.join(' ')).toMatch(/not a backup/);
    });

    it('renders an adult-only labelled panel with live status and no write controls before a file', () => {
      for (const locale of locales) {
        const copy = backupCopy(locale);
        const html = renderToStaticMarkup(
          <BackupRestore
            locale={locale}
            disabled={false}
            badgeOpen={false}
            actions={actions}
            familyLabel={(family) => family}
            onRestored={() => undefined}
          />,
        );
        expect(html).toContain(`lang="${locale}"`);
        expect(html).toContain('aria-labelledby="backup-restore-heading"');
        expect(html).toContain(
          `<h2 id="backup-restore-heading">${copy.heading}</h2>`,
        );
        expect(html.match(/role="status"/g)).toHaveLength(2);
        expect(html).toMatch(
          /<label class="backup-file-choice"><span>[^<]+<\/span><input type="file" accept="\.json,application\/json" data-restore-file="true"\/><\/label>/,
        );
        expect(html).toContain('data-backup-action="prepare"');
        expect(html).not.toContain('data-restore-action="confirm"');
        expect(html).not.toContain('data-backup-save');
        expect(html.match(/<li>/g)).toHaveLength(12);
        expect(html).toContain('data-backup-state="idle"');
        expect(html).toContain('data-restore-state="idle"');
      }
    });

    it('summarizes a profile with labelled values, native language names and help provenance', async () => {
      const world = await syntheticBackupWorld();
      const copy = backupCopy('de-DE');
      const html = renderToStaticMarkup(
        <BackupProfileSummary
          record={world.star}
          copy={copy}
          familyLabel={(family) => `family:${family}`}
          headingLevel="h5"
        />,
      );
      expect(html).toContain(
        '<h5 id="backup-profile-h5-synthetic-player-1">Stern</h5>',
      );
      expect(html).toContain('<dd lang="el-GR">Ελληνικά</dd>');
      expect(html).toContain('<dd lang="en-GB">English</dd>');
      expect(html).toContain('data-backup-world="growing"');
      expect(html).toContain('<dd data-backup-count="independent">4</dd>');
      expect(html).toContain('<dd data-backup-count="supported">2</dd>');
      expect(html).toContain('<dd data-backup-count="worked">1</dd>');
      expect(html).toContain('<dd data-backup-count="help">2</dd>');
      expect(html).toContain('family:groups.equal');
      expect(html).toContain('family:number.addition: ');
      expect(html.match(/<dt>/g)?.length).toBe(html.match(/<dd/g)?.length);
    });
  },
);
