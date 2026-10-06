import { resolvePrototypeLocale } from '../localisation/locales';
import type { Locale, PrototypeLocale } from '../localisation/locales';
import type { OfflineSnapshot } from './controller';

interface OfflineCopy {
  readonly heading: string;
  readonly shell: Readonly<Record<OfflineSnapshot['shell'], string>>;
  readonly separate: string;
  readonly adult: string;
  readonly warning: string;
  readonly action: string;
  readonly update: Readonly<Record<OfflineSnapshot['update'], string>>;
}

/** Draft prototype wording; these browser facts make no language or speech certification. */
const copy: Readonly<Record<PrototypeLocale, OfflineCopy>> = {
  'en-GB': {
    heading: 'Offline shell',
    shell: {
      checking: 'Checking the offline shell.',
      ready: 'The complete offline shell is ready in this tab.',
      unavailable:
        'Offline shell readiness could not be confirmed. Visual use remains available.',
      unsupported:
        'Offline shell support is unavailable here. Visual use remains available.',
    },
    separate:
      'Speech and saved learner progress have separate availability. This prototype does not save progress.',
    adult: 'Adult / developer update',
    warning:
      'Update only at Home in every tab. All tabs reload; the badge and screen selections restart. No learner progress is saved.',
    action: 'Update at Home',
    update: {
      none: 'No staged update.',
      waiting: 'A complete update is waiting. You choose when to update.',
      preparing: 'Checking that every tab is at Home. Keep the tabs open.',
      blocked: 'Update is waiting. Return every tab to Home, then try again.',
      recovering: 'Updating every ready tab. Controls pause until recovery.',
    },
  },
  'el-GR': {
    heading: 'Χρήση χωρίς σύνδεση',
    shell: {
      checking: 'Ελέγχεται η εφαρμογή για χρήση χωρίς σύνδεση.',
      ready:
        'Η πλήρης εφαρμογή είναι έτοιμη χωρίς σύνδεση σε αυτή την καρτέλα.',
      unavailable:
        'Δεν επιβεβαιώθηκε η ετοιμότητα χωρίς σύνδεση. Η οπτική χρήση παραμένει διαθέσιμη.',
      unsupported:
        'Η χρήση χωρίς σύνδεση δεν υποστηρίζεται εδώ. Η οπτική χρήση παραμένει διαθέσιμη.',
    },
    separate:
      'Η ομιλία και η αποθήκευση προόδου έχουν ξεχωριστή διαθεσιμότητα. Το πρωτότυπο δεν αποθηκεύει πρόοδο.',
    adult: 'Ενημέρωση για ενήλικα / προγραμματιστή',
    warning:
      'Ενημέρωση μόνο από την Αρχική σε όλες τις καρτέλες. Όλες φορτώνουν ξανά· το σήμα και η οθόνη ξεκινούν από την αρχή. Δεν αποθηκεύεται πρόοδος.',
    action: 'Ενημέρωση στην Αρχική',
    update: {
      none: 'Δεν υπάρχει έτοιμη ενημέρωση.',
      waiting: 'Μια πλήρης ενημέρωση περιμένει. Εσύ επιλέγεις πότε.',
      preparing:
        'Ελέγχεται αν όλες οι καρτέλες είναι στην Αρχική. Κράτησέ τες ανοιχτές.',
      blocked:
        'Η ενημέρωση περιμένει. Γύρισε όλες τις καρτέλες στην Αρχική και δοκίμασε ξανά.',
      recovering:
        'Ενημερώνονται όλες οι έτοιμες καρτέλες. Τα χειριστήρια περιμένουν μέχρι την επαναφορά.',
    },
  },
  'de-DE': {
    heading: 'Offline-Anwendung',
    shell: {
      checking: 'Die Offline-Anwendung wird geprüft.',
      ready: 'Die vollständige Offline-Anwendung ist in diesem Tab bereit.',
      unavailable:
        'Die Offline-Bereitschaft konnte nicht bestätigt werden. Die visuelle Nutzung bleibt verfügbar.',
      unsupported:
        'Offline-Nutzung wird hier nicht unterstützt. Die visuelle Nutzung bleibt verfügbar.',
    },
    separate:
      'Sprache und gespeicherter Lernfortschritt sind getrennt verfügbar. Dieser Prototyp speichert keinen Fortschritt.',
    adult: 'Update für Erwachsene / Entwicklung',
    warning:
      'Update nur auf der Startseite in allen Tabs. Alle Tabs laden neu; Zeichen und Bildschirmauswahl beginnen neu. Lernfortschritt wird nicht gespeichert.',
    action: 'Auf der Startseite aktualisieren',
    update: {
      none: 'Kein vorbereitetes Update.',
      waiting: 'Ein vollständiges Update wartet. Du wählst den Zeitpunkt.',
      preparing:
        'Es wird geprüft, ob alle Tabs auf der Startseite sind. Lass die Tabs geöffnet.',
      blocked:
        'Das Update wartet. Öffne die Startseite in allen Tabs und versuche es erneut.',
      recovering:
        'Alle bereiten Tabs werden aktualisiert. Die Bedienung pausiert bis zur Wiederherstellung.',
    },
  },
};

export function offlineCopy(locale: Locale) {
  const effectiveLocale = resolvePrototypeLocale(locale).effectiveLocale;
  return { locale: effectiveLocale, ...copy[effectiveLocale] };
}
