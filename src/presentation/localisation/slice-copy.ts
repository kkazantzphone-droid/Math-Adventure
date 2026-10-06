import { formatInteger } from './format';
import { resolvePrototypeLocale } from './locales';
import type { Locale, PrototypeLocale } from './locales';
import { offlineCopy } from '../offline/copy';

/** Separate slice schema: every current release-target message is a draft. */
export const SLICE_MESSAGE_SCHEMA = 'slice-messages-v1';
export const SLICE_PACK_VERSION = '0.1.0-synthetic-slice';

// Every row contains Greek, British English and German. Planned packs have no copy.
const entries = [
  [
    'slice.updateAction',
    'Έλεγχος και ενημέρωση',
    'Check and update',
    'Prüfen und aktualisieren',
  ],
  [
    'slice.updateWarning',
    'Όλες οι καρτέλες επαναφορτώνονται. Ολοκλήρωσε ή έλεγξε τις αποθηκεύσεις σε κάθε καρτέλα και διάλεξε αποθηκευμένο συνθετικό προφίλ. Η προσωρινή εξερεύνηση ξεκινά ξανά.',
    'Every tab reloads. Finish or reconcile saves in every tab and select a saved synthetic profile. Temporary exploration restarts.',
    'Alle Tabs laden neu. Schließe oder prüfe Speicherungen in jedem Tab und wähle ein gespeichertes synthetisches Profil. Vorübergehendes Erkunden beginnt neu.',
  ],
  [
    'slice.updatePreparing',
    'Ελέγχονται οι αποθηκεύσεις και η συμβατότητα σε κάθε καρτέλα. Κράτησε τις καρτέλες ανοιχτές.',
    'Checking saves and compatibility in every tab. Keep the tabs open.',
    'Speicherungen und Kompatibilität werden in jedem Tab geprüft. Lass die Tabs geöffnet.',
  ],
  [
    'slice.updateBlocked',
    'Έλεγξε εκκρεμείς αποθηκεύσεις και διάλεξε αποθηκευμένο συνθετικό προφίλ σε κάθε καρτέλα. Άγνωστες μορφές δεν αλλάζουν.',
    'Reconcile pending saves and select a saved synthetic profile in every tab. Unknown formats are preserved.',
    'Prüfe ausstehende Speicherungen und wähle ein gespeichertes synthetisches Profil in jedem Tab. Unbekannte Formate bleiben erhalten.',
  ],
  [
    'slice.storageSeparate',
    'Η ετοιμότητα χωρίς σύνδεση και η αποθήκευση συνθετικών προφίλ ελέγχονται χωριστά.',
    'Offline readiness and synthetic profile saving are checked separately.',
    'Offline-Bereitschaft und Speicherung synthetischer Profile werden getrennt geprüft.',
  ],
  [
    'slice.tryRecommendation',
    'Δοκίμασε την προτεινόμενη δραστηριότητα',
    'Try the suggested activity',
    'Probiere die vorgeschlagene Aufgabe',
  ],
  [
    'slice.storageChoice',
    'Χρήση τοπικής συνθετικής αποθήκευσης',
    'Use local synthetic storage',
    'Lokalen synthetischen Speicher verwenden',
  ],
  [
    'slice.profileHeading',
    'Διάλεξε συνθετικό προφίλ',
    'Choose a synthetic profile',
    'Wähle ein synthetisches Profil',
  ],
  [
    'slice.profileChoice',
    'Συνθετικός παίκτης {player}',
    'Synthetic player {player}',
    'Synthetische Spielfigur {player}',
  ],
  ['slice.changeProfile', 'Άλλαξε προφίλ', 'Change profile', 'Profil wechseln'],
  [
    'slice.chooseActivity',
    'Τι θέλεις να δοκιμάσεις;',
    'What would you like to try?',
    'Was möchtest du ausprobieren?',
  ],
  ['slice.skip', 'Άλλη δραστηριότητα', 'Another activity', 'Andere Aufgabe'],
  ['slice.stop', 'Σταμάτησε', 'Stop', 'Aufhören'],
  [
    'slice.stopped',
    'Σταματήσαμε. Μπορείς να επιστρέψεις όποτε θέλεις.',
    'We have stopped. You can come back whenever you like.',
    'Wir haben aufgehört. Du kannst jederzeit zurückkommen.',
  ],
  [
    'slice.anotherExample',
    'Άλλο παράδειγμα',
    'Another example',
    'Anderes Beispiel',
  ],
  [
    'slice.workedExample',
    'Δες ένα παράδειγμα',
    'See an example',
    'Ein Beispiel ansehen',
  ],
  [
    'slice.chooseAnother',
    'Διάλεξε κάτι άλλο',
    'Choose something else',
    'Etwas anderes wählen',
  ],
  [
    'slice.resume',
    'Συνέχισε τη συνεδρία',
    'Resume this session',
    'Diese Sitzung fortsetzen',
  ],
  [
    'slice.startNewSession',
    'Ξεκίνα νέα συνεδρία',
    'Start a new session',
    'Neue Sitzung beginnen',
  ],
  ['slice.saving', 'Αποθηκεύεται…', 'Saving…', 'Wird gespeichert…'],
  [
    'slice.saved',
    'Αποθηκεύτηκε σε αυτή τη συσκευή.',
    'Saved on this device.',
    'Auf diesem Gerät gespeichert.',
  ],
  [
    'slice.unsaved',
    'Παίζεις χωρίς αποθήκευση.',
    'You are playing without saving.',
    'Du spielst ohne Speicherung.',
  ],
  [
    'slice.saveFailed',
    'Δεν αποθηκεύτηκε. Μπορείς να συνεχίσεις χωρίς αποθήκευση.',
    'This was not saved. You can continue without saving.',
    'Das wurde nicht gespeichert. Du kannst ohne Speicherung weiterspielen.',
  ],
  [
    'slice.storageUnavailable',
    'Η αποθήκευση δεν είναι διαθέσιμη.',
    'Storage is unavailable.',
    'Speicherung ist nicht verfügbar.',
  ],
  [
    'slice.askAdult',
    'Ζήτησε βοήθεια από έναν ενήλικα.',
    'Ask an adult for help.',
    'Bitte eine erwachsene Person um Hilfe.',
  ],
  [
    'slice.readOnly',
    'Οι αποθηκευμένες πληροφορίες μπορούν μόνο να διαβαστούν.',
    'Saved information can only be read.',
    'Gespeicherte Informationen können nur gelesen werden.',
  ],
  [
    'slice.changedElsewhere',
    'Οι πληροφορίες άλλαξαν σε άλλο παράθυρο.',
    'The information changed in another window.',
    'Die Informationen wurden in einem anderen Fenster geändert.',
  ],
  [
    'slice.reloadChoice',
    'Έλεγξε ξανά την αποθηκευμένη κατάσταση',
    'Check saved state again',
    'Gespeicherten Stand erneut prüfen',
  ],
  [
    'slice.noTask',
    'Διάλεξε μια δραστηριότητα για να ξεκινήσεις.',
    'Choose an activity to begin.',
    'Wähle eine Aufgabe zum Beginnen.',
  ],
  [
    'slice.retrySave',
    'Δοκίμασε ξανά την αποθήκευση',
    'Try saving again',
    'Speichern erneut versuchen',
  ],
  [
    'slice.checkingSave',
    'Ελέγχουμε αν αποθηκεύτηκε…',
    'Checking whether this was saved…',
    'Wir prüfen, ob dies gespeichert wurde…',
  ],
  [
    'slice.numeralPrompt',
    'Διάλεξε την ομάδα που ταιριάζει με τον αριθμό.',
    'Choose the group that matches the numeral.',
    'Wähle die Gruppe, die zur Ziffer passt.',
  ],
  [
    'slice.countPrompt',
    'Μέτρησε τα αντικείμενα. Πόσα είναι;',
    'Count the items. How many are there?',
    'Zähle die Gegenstände. Wie viele sind es?',
  ],
  [
    'slice.comparePrompt',
    'Σύγκρινε την πρώτη ομάδα με τη δεύτερη.',
    'Compare the first group with the second.',
    'Vergleiche die erste Gruppe mit der zweiten.',
  ],
  [
    'slice.subtractPrompt',
    'Τα διαγραμμένα αντικείμενα αφαιρέθηκαν. Πόσα μένουν;',
    'The crossed-out items were removed. How many remain?',
    'Die durchgestrichenen Gegenstände wurden weggenommen. Wie viele bleiben?',
  ],
  [
    'slice.missingNumberPrompt',
    'Ποιος αριθμός λείπει;',
    'Which number is missing?',
    'Welche Zahl fehlt?',
  ],
  [
    'slice.numeralHint',
    'Ταίριαξε τον αριθμό με μια ομάδα. Μέτρησε κάθε αντικείμενο μία φορά.',
    'Match the numeral to a group. Count each item once.',
    'Ordne die Ziffer einer Gruppe zu. Zähle jeden Gegenstand einmal.',
  ],
  [
    'slice.countHint',
    'Μέτρησε κάθε αντικείμενο μία φορά. Ο τελευταίος αριθμός λέει πόσα είναι.',
    'Count each item once. The last number tells how many there are.',
    'Zähle jeden Gegenstand einmal. Die letzte Zahl sagt, wie viele es sind.',
  ],
  [
    'slice.compareHint',
    'Ταίριαξε ένα αντικείμενο από κάθε ομάδα. Κοίτα αν περισσεύουν αντικείμενα.',
    'Pair one item from each group. Look for any items left over.',
    'Ordne jeder Gruppe einen Gegenstand der anderen Gruppe zu. Schau, ob welche übrig bleiben.',
  ],
  [
    'slice.subtractHint',
    'Κοίτα τα αντικείμενα που δεν αφαιρέθηκαν. Μέτρησέ τα μία φορά.',
    'Look at the items that were not removed. Count each one once.',
    'Schau auf die Gegenstände, die nicht weggenommen wurden. Zähle jeden einmal.',
  ],
  [
    'slice.missingNumberHint',
    'Τα δύο μέρη μαζί κάνουν το σύνολο. Βρες το μέρος που λείπει ή το σύνολο.',
    'The two parts together make the total. Find the missing part or total.',
    'Die beiden Teile ergeben zusammen das Ganze. Finde den fehlenden Teil oder das Ganze.',
  ],
  [
    'slice.solutionShown',
    'Είδες μια λύση. Μπορείς να δοκιμάσεις άλλο παράδειγμα.',
    'You have seen a solution. You can try another example.',
    'Du hast eine Lösung gesehen. Du kannst ein anderes Beispiel ausprobieren.',
  ],
  [
    'slice.answerLabel',
    'Διάλεξε απάντηση',
    'Choose an answer',
    'Wähle eine Antwort',
  ],
  [
    'slice.quantityItems',
    'Ομάδα αντικειμένων',
    'Group of items',
    'Gruppe von Gegenständen',
  ],
  ['slice.comparisonLess', 'Λιγότερα', 'Fewer', 'Weniger'],
  ['slice.comparisonEqual', 'Τόσα όσα', 'The same number', 'Gleich viele'],
  ['slice.comparisonGreater', 'Περισσότερα', 'More', 'Mehr'],
  [
    'slice.missingPosition',
    'Λείπει: {position}',
    'Missing: {position}',
    'Es fehlt: {position}',
  ],
  [
    'slice.profileSelected',
    'Επιλέχθηκε ο συνθετικός παίκτης {player}.',
    'Synthetic player {player} selected.',
    'Synthetische Spielfigur {player} ausgewählt.',
  ],
  [
    'slice.sessionRestored',
    'Η ίδια συνεδρία αποκαταστάθηκε.',
    'The same session has been restored.',
    'Dieselbe Sitzung wurde wiederhergestellt.',
  ],
  [
    'recommendation.manual',
    'Χειροκίνητη επιλογή — δεν συλλέγονται δεδομένα αξιολόγησης.',
    'Manual choice — no assessment evidence is collected.',
    'Manuelle Auswahl — es werden keine Bewertungsnachweise gesammelt.',
  ],
  [
    'recommendation.requestedHelp',
    'Προτάθηκε υποστήριξη μετά από αίτημα βοήθειας.',
    'Support was offered after a request for help.',
    'Nach einer Bitte um Hilfe wurde Unterstützung angeboten.',
  ],
  [
    'recommendation.support',
    'Η συνθετική πολιτική προτείνει υποστήριξη.',
    'The synthetic policy suggests support.',
    'Die synthetische Regel schlägt Unterstützung vor.',
  ],
  [
    'recommendation.revisit',
    'Η συνθετική πολιτική προτείνει επανάληψη.',
    'The synthetic policy suggests revisiting this activity.',
    'Die synthetische Regel schlägt vor, diese Aufgabe erneut zu versuchen.',
  ],
  [
    'recommendation.developing',
    'Προτείνεται περισσότερη εξάσκηση σε αυτή την έννοια.',
    'More practice with this concept is suggested.',
    'Weitere Übung zu diesem Begriff wird vorgeschlagen.',
  ],
  [
    'recommendation.new',
    'Προτείνεται μια νέα έννοια για δοκιμή.',
    'A new concept is suggested to try.',
    'Ein neuer Begriff wird zum Ausprobieren vorgeschlagen.',
  ],
  [
    'recommendation.familiar',
    'Προτείνεται μια γνώριμη δραστηριότητα.',
    'A familiar activity is suggested.',
    'Eine vertraute Aufgabe wird vorgeschlagen.',
  ],
  [
    'recommendation.limitedEvidence',
    'Τα διαθέσιμα στοιχεία είναι περιορισμένα. Δεν βγαίνει συμπέρασμα κατάκτησης.',
    'Available evidence is limited. No mastery conclusion is made.',
    'Die verfügbaren Nachweise sind begrenzt. Es wird keine Beherrschung festgestellt.',
  ],
  [
    'recommendation.clockUncertain',
    'Η ημέρα είναι αβέβαιη. Δεν προγραμματίζεται επανάληψη με βάση τον χρόνο.',
    'The day is uncertain. No time-based revisit is scheduled.',
    'Der Tag ist unklar. Es wird keine zeitabhängige Wiederholung geplant.',
  ],
  [
    'slice.adultHeading',
    'Συνθετικοί έλεγχοι ανάπτυξης',
    'Synthetic developer controls',
    'Synthetische Entwicklungssteuerung',
  ],
  [
    'slice.manualMode',
    'Χειροκίνητο — χωρίς δεδομένα αξιολόγησης',
    'Manual — no assessment evidence',
    'Manuell — ohne Bewertungsnachweise',
  ],
  [
    'slice.simulationMode',
    'Προσομοίωση προτεινόμενης πολιτικής',
    'Simulate proposed policy',
    'Vorgeschlagene Regel simulieren',
  ],
  [
    'slice.syntheticNotice',
    'Μόνο σταθερά συνθετικά προφίλ. Δοκιμή ανάπτυξης — όχι για πραγματικά παιδιά.',
    'Fixed synthetic profiles only. Developer test — not for real children.',
    'Nur feste synthetische Profile. Entwicklungstest — nicht für echte Kinder.',
  ],
  [
    'slice.recoveryHeading',
    'Έλεγχος αποθήκευσης και ανάκτηση',
    'Storage check and recovery',
    'Speicherprüfung und Wiederherstellung',
  ],
  [
    'slice.closeOtherTabs',
    'Κλείσε τα άλλα παράθυρα αυτής της δοκιμής.',
    'Close the other windows for this test.',
    'Schließe die anderen Fenster dieses Tests.',
  ],
  [
    'slice.upgradeBlocked',
    'Η αναβάθμιση περιμένει να κλείσουν τα άλλα παράθυρα.',
    'The upgrade is waiting for other windows to close.',
    'Die Aktualisierung wartet, bis die anderen Fenster geschlossen sind.',
  ],
  [
    'slice.futureSchema',
    'Τα δεδομένα έχουν νεότερη μορφή. Δεν θα αλλάξουν ή διαγραφούν.',
    'The data has a newer format. It will not be changed or deleted.',
    'Die Daten haben ein neueres Format. Sie werden nicht geändert oder gelöscht.',
  ],
  [
    'slice.migrationFailed',
    'Η μετατροπή δεν ολοκληρώθηκε. Διατηρούνται τα προηγούμενα δεδομένα.',
    'The conversion did not complete. Previous data is preserved.',
    'Die Umwandlung wurde nicht abgeschlossen. Die bisherigen Daten bleiben erhalten.',
  ],
  [
    'slice.recoveryPending',
    'Ο έλεγχος δεν έχει ολοκληρωθεί. Οι αλλαγές περιμένουν.',
    'The check has not finished. Changes are paused.',
    'Die Prüfung ist noch nicht abgeschlossen. Änderungen sind angehalten.',
  ],
  [
    'slice.clearPending',
    'Ελέγχουμε την αφαίρεση της συνθετικής δοκιμής.',
    'Checking removal of the synthetic test.',
    'Entfernung des synthetischen Tests wird geprüft.',
  ],
  [
    'slice.deleteProfile',
    'Αφαίρεσε το συνθετικό προφίλ',
    'Remove synthetic profile',
    'Synthetisches Profil entfernen',
  ],
  [
    'slice.confirmDelete',
    'Να αφαιρεθεί αυτό το συνθετικό προφίλ;',
    'Remove this synthetic profile?',
    'Dieses synthetische Profil entfernen?',
  ],
  [
    'slice.clearLocal',
    'Καθάρισε τη συνθετική δοκιμή',
    'Clear synthetic test',
    'Synthetischen Test löschen',
  ],
  [
    'slice.confirmClear',
    'Να αφαιρεθούν όλα τα προφίλ αυτής της συνθετικής δοκιμής;',
    'Remove all profiles for this synthetic test?',
    'Alle Profile dieses synthetischen Tests entfernen?',
  ],
  ['slice.cancel', 'Ακύρωσε', 'Cancel', 'Abbrechen'],
  [
    'slice.retainedFenceNotice',
    'Διατηρείται μόνο ο μη προσωπικός φραγμός που απορρίπτει παλιές εγγραφές.',
    'Only the nonpersonal fence that rejects stale writes is retained.',
    'Nur die nicht personenbezogene Sperre gegen veraltete Schreibvorgänge bleibt erhalten.',
  ],
  [
    'slice.uiLanguage',
    'Γλώσσα χειριστηρίων',
    'Controls language',
    'Sprache der Bedienelemente',
  ],
  [
    'slice.instructionLanguage',
    'Γλώσσα οδηγιών',
    'Instructions language',
    'Sprache der Anweisungen',
  ],
  [
    'slice.numberSpeechLanguage',
    'Γλώσσα εκφώνησης αριθμών',
    'Number speech language',
    'Sprache der Zahlenausgabe',
  ],
  [
    'slice.languageDraft',
    'Προσχέδιο — αναμένεται έλεγχος από φυσικό ομιλητή.',
    'Draft — native-language review is pending.',
    'Entwurf — Prüfung durch Muttersprachler steht aus.',
  ],
  [
    'slice.speechUnavailable',
    'Δεν υπάρχει διαθέσιμη ακριβής τοπική φωνή. Τα οπτικά χειριστήρια παραμένουν διαθέσιμα.',
    'No exact local voice is available. Visual controls remain available.',
    'Keine passende lokale Stimme ist verfügbar. Die sichtbaren Bedienelemente bleiben verfügbar.',
  ],
  [
    'slice.speechReportedLocal',
    'Η φωνή δηλώνεται τοπική. Αυτό δεν αποδεικνύει λειτουργία χωρίς σύνδεση.',
    'The voice reports that it is local. This does not prove offline operation.',
    'Die Stimme meldet sich als lokal. Das beweist keinen Betrieb ohne Verbindung.',
  ],
  [
    'slice.numeralActivity',
    'Αριθμός και ομάδα',
    'Numeral and group',
    'Ziffer und Gruppe',
  ],
  [
    'slice.countActivity',
    'Μέτρησε αντικείμενα',
    'Count items',
    'Gegenstände zählen',
  ],
  [
    'slice.compareActivity',
    'Σύγκρινε ομάδες',
    'Compare groups',
    'Gruppen vergleichen',
  ],
  [
    'slice.subtractActivity',
    'Αφαίρεσε αντικείμενα',
    'Remove items',
    'Gegenstände wegnehmen',
  ],
  [
    'slice.missingActivity',
    'Αριθμός που λείπει',
    'Missing number',
    'Fehlende Zahl',
  ],
  ['slice.item', 'Αντικείμενο', 'Item', 'Gegenstand'],
  [
    'slice.removedItem',
    'Αντικείμενο που αφαιρέθηκε',
    'Removed item',
    'Weggenommener Gegenstand',
  ],
  ['slice.emptyGroup', 'Κενή ομάδα', 'Empty group', 'Leere Gruppe'],
  ['slice.firstGroup', 'Πρώτη ομάδα', 'First group', 'Erste Gruppe'],
  ['slice.secondGroup', 'Δεύτερη ομάδα', 'Second group', 'Zweite Gruppe'],
  ['slice.groupChoice', 'Ομάδα', 'Group', 'Gruppe'],
  [
    'slice.savedActivities',
    'Αποθηκευμένες δραστηριότητες: {count}',
    'Saved activities: {count}',
    'Gespeicherte Aufgaben: {count}',
  ],
] as const satisfies readonly (readonly [string, string, string, string])[];

export type SliceMessageId = (typeof entries)[number][0];
export function sliceOfflineCopy(
  locale: Locale,
): ReturnType<typeof offlineCopy> {
  const base = offlineCopy(locale);
  return {
    ...base,
    separate: formatSlice(locale, 'slice.storageSeparate'),
    warning: formatSlice(locale, 'slice.updateWarning'),
    action: formatSlice(locale, 'slice.updateAction'),
    update: {
      ...base.update,
      preparing: formatSlice(locale, 'slice.updatePreparing'),
      blocked: formatSlice(locale, 'slice.updateBlocked'),
    },
  };
}
export const SLICE_MESSAGE_IDS: readonly SliceMessageId[] = Object.freeze(
  entries.map(([key]) => key),
);
export type SliceMessageArguments<Key extends SliceMessageId> = Key extends
  'slice.profileChoice' | 'slice.profileSelected'
  ? { readonly player: 1 | 2 }
  : Key extends 'slice.missingPosition'
    ? { readonly position: 'left' | 'right' | 'total' }
    : Key extends 'slice.savedActivities'
      ? { readonly count: number }
      : undefined;

export const slicePackManifests = Object.freeze(
  ['el-GR', 'en-GB', 'de-DE'].map((locale) =>
    Object.freeze({
      locale,
      packVersion: SLICE_PACK_VERSION,
      messageSchemaVersion: SLICE_MESSAGE_SCHEMA,
      contentVersion: 'phase3c-content-v1',
      status: 'draft',
      completeness: 'complete-slice',
      reviewStatus: 'native-review-pending',
      reviewers: Object.freeze([]),
      official: false,
    }),
  ),
);

const positionNames: Readonly<
  Record<PrototypeLocale, Readonly<Record<'left' | 'right' | 'total', string>>>
> = {
  'el-GR': {
    left: 'το πρώτο μέρος',
    right: 'το δεύτερο μέρος',
    total: 'το σύνολο',
  },
  'en-GB': {
    left: 'the first part',
    right: 'the second part',
    total: 'the total',
  },
  'de-DE': {
    left: 'der erste Teil',
    right: 'der zweite Teil',
    total: 'das Ganze',
  },
};

function argumentsRecord(input: unknown, key: string): unknown {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.getOwnPropertySymbols(input).length !== 0 ||
    Object.getOwnPropertyNames(input).length !== 1
  )
    throw new RangeError('invalid-slice-arguments');
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor))
    throw new RangeError('invalid-slice-arguments');
  return descriptor.value as unknown;
}

export function formatSlice<Key extends SliceMessageId>(
  locale: Locale,
  key: Key,
  ...args: SliceMessageArguments<Key> extends undefined
    ? []
    : [SliceMessageArguments<Key>]
): string {
  const effective = resolvePrototypeLocale(locale).effectiveLocale;
  const row = entries.find(([id]) => id === key);
  if (!row) throw new RangeError('missing-slice-message');
  const text = row[effective === 'el-GR' ? 1 : effective === 'en-GB' ? 2 : 3];
  if (key === 'slice.profileChoice' || key === 'slice.profileSelected') {
    const player = argumentsRecord(args[0], 'player');
    if (player !== 1 && player !== 2)
      throw new RangeError('invalid-synthetic-player');
    return text.replace('{player}', formatInteger(effective, player));
  }
  if (key === 'slice.savedActivities') {
    const count = argumentsRecord(args[0], 'count');
    if (
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 500
    )
      throw new RangeError('invalid-slice-count');
    return text.replace('{count}', formatInteger(effective, count));
  }
  if (key === 'slice.missingPosition') {
    const position = argumentsRecord(args[0], 'position');
    if (position !== 'left' && position !== 'right' && position !== 'total')
      throw new RangeError('invalid-missing-position');
    return text.replace('{position}', positionNames[effective][position]);
  }
  if (args.length !== 0) throw new RangeError('unexpected-slice-arguments');
  return text;
}
