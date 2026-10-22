import type { Locale } from './locales';
import { resolvePrototypeLocale } from './locales';

/** Complete authored drafts for adult backup/restore, pending native review. */
export const BACKUP_COPY_VERSION = 'keep-my-adventure-draft-v1';

const english = {
  heading: 'Keep this adventure',
  intro:
    'Save a backup file of the badges saved in this browser, or bring a backup back into a browser where no badge is saved yet.',
  kindsHeading: 'Saving, backups and offline use',
  kinds: [
    'Browser saving keeps Star and Triangle in this browser on this device. A browser can lose saved data, for example when its site data is cleared.',
    'A backup file is a separate copy that you keep. The app does not upload it anywhere.',
    'Working offline uses app files that this browser has stored. That is not a backup.',
    'Offline speech depends on voices on this device. Voices are not part of a backup.',
  ],
  containsHeading: 'What a backup contains',
  contains: [
    'Each saved badge, Star or Triangle, with its language choices.',
    'Finished activities and, for practice that counts as evidence, which answers were independent, which used help, a worked example or another try, and which need another look.',
    'Discoveries, invitation progress, the play choice and the activity to continue with.',
    'Version details, so that a later version can check the file before using it.',
  ],
  excludesHeading: 'What a backup does not contain',
  excludes: [
    'Explore workshop moves. Explore is never saved.',
    'Play while saving was switched off, and an answer that was still being saved.',
    'This browser’s internal save counters and safety records. A restored copy gets new ones.',
    'Voices, offline app files, names, accounts or anything from other websites.',
  ],
  privacy:
    'The file is a private copy of this synthetic review data. Anyone who has the file can read it, so keep it somewhere you control. It stays separate from the app: deleting saved badges here does not delete the file, and the app cannot delete copies you have made.',
  checksum:
    'A checksum inside the file notices accidental damage. It is not a password, encryption or proof of who made the file.',
  backupHeading: 'Make a backup',
  prepare: 'Prepare a backup',
  preparing: 'Preparing and checking the backup…',
  nothingSaved:
    'No badge is saved in this browser yet, so there is nothing to back up.',
  backupFailed: 'The backup could not be prepared. Nothing was changed.',
  ready: 'The backup is ready and was read back successfully. It includes:',
  pendingExcluded:
    'An answer that was still being saved is not included. The backup holds that badge’s last completed save; the unfinished answer stays only in this browser.',
  saveFile: 'Save backup file',
  fileName: 'File name',
  saveRequested:
    'Your browser was asked to save the file. Check that it appears in your downloads or chosen folder before you rely on it. Saving again makes another copy.',
  restoreHeading: 'Restore a backup',
  restoreIntro:
    'Restore works only where no badge is saved yet, for example in a new browser or after both badges were deleted. It never replaces or mixes saved badges. Star comes back as Star and Triangle as Triangle.',
  chooseFile: 'Choose a backup file',
  checkingFile: 'Checking the file. Nothing is restored yet.',
  refused: {
    unreadable: 'The file could not be read. Nothing was changed.',
    too_large:
      'This file is too large to be a backup from this app. Nothing was changed.',
    not_backup:
      'This file is not a Math Adventure backup. Nothing was changed.',
    damaged:
      'This backup is damaged or is not exactly as the app made it. Nothing was changed.',
    newer_version:
      'This backup was made by a newer version of the app. Nothing was changed.',
    incompatible:
      'This backup was made with different activities or rules, so this version cannot use it safely. Nothing was changed.',
    invalid_contents:
      'This backup contains something this version cannot accept. Nothing was changed.',
  },
  previewHeading: 'Check before restoring',
  previewIntro:
    'The file passed this version’s checks. Nothing has been restored yet.',
  worlds: { original: 'Original activities', growing: 'Growing world' },
  fields: {
    world: 'Saved world',
    screenLanguage: 'Screen language',
    instructionLanguage: 'Instruction language',
    numberLanguage: 'Number speech language',
    mode: 'Play choice',
    activity: 'Continue with',
    session: 'Session',
    finished: 'Finished activities',
    independent: 'Independent successes',
    supported: 'Successes with help or another try',
    worked: 'Worked examples (learning with help, not independent)',
    confirmations:
      'Repeat independent successes confirming a relationship (no new case)',
    notYet: 'Not yet',
    notCounted:
      'Answers not counted as evidence (for example repeats or a simpler version of an activity)',
    accomplishments: 'Experimental practice states (not a mastery measure)',
    discoveries: 'Discoveries tried independently in different ways',
    help: 'Help saved in the latest session',
  },
  modes: { manual: 'Just play', 'synthetic-policy': 'Guided practice' },
  sessionOpen: 'open',
  sessionStopped: 'stopped',
  states: {
    Emerging: 'practice started',
    Developing: 'developing in practice',
    Secure: 'steady in practice (experimental rule)',
  },
  none: 'none',
  destination: {
    checking: 'Checking this browser…',
    available:
      'No badge is saved in this browser, so the backup can be restored here.',
    occupied:
      'This browser already has saved badges. Restore is available only where no badge is saved, so nothing will be changed here.',
    unavailable:
      'Saving is not available in this browser right now, so restore cannot start. Nothing was changed.',
  },
  closesBadge:
    'After restoring, a badge open in this window closes and play that was not being saved is lost. Choose a badge again afterwards.',
  restore: 'Restore these badges',
  cancel: 'Cancel',
  cancelled: 'Restore cancelled. Nothing was changed.',
  restoring: 'Restoring. Keep this page open…',
  restored:
    'Restored and checked. These badges are now saved in this browser. Choose a badge to continue. Your backup file is still a separate copy.',
  notRestored: {
    occupied:
      'A badge was saved here in another window first. Nothing was restored or replaced.',
    changed:
      'Saved badges changed in another window while restoring, for example one was deleted. Nothing was restored or replaced. Check this browser again before restoring.',
    quota:
      'There is not enough storage space in this browser. Nothing was restored.',
    unavailable: 'The restore could not be saved. Nothing was restored.',
    blocked:
      'Saving or an update is still in progress. Wait for it to finish, then try again.',
    differs:
      'Saved badges here are different from this backup, for example because play continued after restoring or another window changed them. Restoring never replaces saved badges. Choose a badge to see what is saved.',
    absent:
      'No badge from this backup is saved in this browser now, and nothing was replaced. Check this browser again before restoring.',
  },
  checkBrowser: 'Check this browser again',
  uncertain:
    'The result could not be confirmed. Nothing was overwritten. Check again to see what is saved.',
  checkAgain: 'Check again',
  badges: { star: 'Star', triangle: 'Triangle' },
};

export type BackupCopy = typeof english;

const greek: BackupCopy = {
  heading: 'Κρατήστε αυτή την περιπέτεια',
  intro:
    'Αποθηκεύστε ένα αρχείο αντιγράφου ασφαλείας με τα σήματα που είναι αποθηκευμένα σε αυτό το πρόγραμμα περιήγησης ή φέρτε πίσω ένα αντίγραφο σε πρόγραμμα περιήγησης όπου δεν υπάρχει ακόμη αποθηκευμένο σήμα.',
  kindsHeading: 'Αποθήκευση, αντίγραφα ασφαλείας και χρήση εκτός σύνδεσης',
  kinds: [
    'Η αποθήκευση στο πρόγραμμα περιήγησης κρατά το Αστέρι και το Τρίγωνο σε αυτό το πρόγραμμα περιήγησης, σε αυτή τη συσκευή. Ένα πρόγραμμα περιήγησης μπορεί να χάσει αποθηκευμένα δεδομένα, για παράδειγμα όταν διαγράφονται τα δεδομένα ιστότοπου.',
    'Ένα αρχείο αντιγράφου ασφαλείας είναι χωριστό αντίγραφο που κρατάτε εσείς. Η εφαρμογή δεν το ανεβάζει πουθενά.',
    'Η χρήση εκτός σύνδεσης χρησιμοποιεί αρχεία της εφαρμογής που έχει αποθηκεύσει αυτό το πρόγραμμα περιήγησης. Αυτό δεν είναι αντίγραφο ασφαλείας.',
    'Η ομιλία εκτός σύνδεσης εξαρτάται από τις φωνές αυτής της συσκευής. Οι φωνές δεν περιλαμβάνονται σε αντίγραφο ασφαλείας.',
  ],
  containsHeading: 'Τι περιέχει ένα αντίγραφο ασφαλείας',
  contains: [
    'Κάθε αποθηκευμένο σήμα, Αστέρι ή Τρίγωνο, με τις επιλογές γλώσσας του.',
    'Ολοκληρωμένες δραστηριότητες και, για την εξάσκηση που μετρά ως στοιχείο, ποιες απαντήσεις ήταν ανεξάρτητες, ποιες χρειάστηκαν βοήθεια, λυμένο παράδειγμα ή νέα προσπάθεια και ποιες θέλουν άλλη μια ματιά.',
    'Ανακαλύψεις, πρόοδο προτάσεων, την επιλογή παιχνιδιού και τη δραστηριότητα για να συνεχίσετε.',
    'Στοιχεία έκδοσης, ώστε μια μεταγενέστερη έκδοση να ελέγχει το αρχείο πριν το χρησιμοποιήσει.',
  ],
  excludesHeading: 'Τι δεν περιέχει ένα αντίγραφο ασφαλείας',
  excludes: [
    'Κινήσεις στο εργαστήριο της Εξερεύνησης. Η Εξερεύνηση δεν αποθηκεύεται ποτέ.',
    'Παιχνίδι με απενεργοποιημένη αποθήκευση και μια απάντηση που αποθηκευόταν ακόμη.',
    'Τους εσωτερικούς μετρητές αποθήκευσης και τα στοιχεία ασφαλείας αυτού του προγράμματος περιήγησης. Ένα αντίγραφο που επαναφέρεται παίρνει καινούργια.',
    'Φωνές, αρχεία της εφαρμογής για χρήση εκτός σύνδεσης, ονόματα, λογαριασμούς ή οτιδήποτε από άλλους ιστότοπους.',
  ],
  privacy:
    'Το αρχείο είναι ιδιωτικό αντίγραφο αυτών των συνθετικών δεδομένων δοκιμής. Όποιος έχει το αρχείο μπορεί να το διαβάσει, γι’ αυτό φυλάξτε το κάπου που ελέγχετε εσείς. Μένει χωριστό από την εφαρμογή: η διαγραφή των αποθηκευμένων σημάτων εδώ δεν διαγράφει το αρχείο και η εφαρμογή δεν μπορεί να διαγράψει αντίγραφα που έχετε φτιάξει.',
  checksum:
    'Ένα άθροισμα ελέγχου μέσα στο αρχείο εντοπίζει τυχαία φθορά. Δεν είναι κωδικός, κρυπτογράφηση ή απόδειξη για το ποιος έφτιαξε το αρχείο.',
  backupHeading: 'Δημιουργία αντιγράφου ασφαλείας',
  prepare: 'Ετοιμάστε αντίγραφο ασφαλείας',
  preparing: 'Γίνεται προετοιμασία και έλεγχος του αντιγράφου…',
  nothingSaved:
    'Δεν υπάρχει ακόμη αποθηκευμένο σήμα σε αυτό το πρόγραμμα περιήγησης, οπότε δεν υπάρχει κάτι για αντίγραφο ασφαλείας.',
  backupFailed:
    'Δεν ήταν δυνατή η προετοιμασία του αντιγράφου. Δεν άλλαξε τίποτα.',
  ready:
    'Το αντίγραφο ασφαλείας είναι έτοιμο και διαβάστηκε ξανά με επιτυχία. Περιλαμβάνει:',
  pendingExcluded:
    'Μια απάντηση που αποθηκευόταν ακόμη δεν περιλαμβάνεται. Το αντίγραφο κρατά την τελευταία ολοκληρωμένη αποθήκευση εκείνου του σήματος· η ημιτελής απάντηση μένει μόνο σε αυτό το πρόγραμμα περιήγησης.',
  saveFile: 'Αποθήκευση αρχείου αντιγράφου',
  fileName: 'Όνομα αρχείου',
  saveRequested:
    'Ζητήθηκε από το πρόγραμμα περιήγησης να αποθηκεύσει το αρχείο. Ελέγξτε ότι εμφανίζεται στις λήψεις ή στον φάκελο που επιλέξατε πριν βασιστείτε σε αυτό. Μια νέα αποθήκευση φτιάχνει άλλο αντίγραφο.',
  restoreHeading: 'Επαναφορά αντιγράφου ασφαλείας',
  restoreIntro:
    'Η επαναφορά γίνεται μόνο όπου δεν υπάρχει ακόμη αποθηκευμένο σήμα, για παράδειγμα σε νέο πρόγραμμα περιήγησης ή αφού διαγραφούν και τα δύο σήματα. Δεν αντικαθιστά και δεν αναμειγνύει ποτέ αποθηκευμένα σήματα. Το Αστέρι επιστρέφει ως Αστέρι και το Τρίγωνο ως Τρίγωνο.',
  chooseFile: 'Επιλέξτε αρχείο αντιγράφου ασφαλείας',
  checkingFile: 'Γίνεται έλεγχος του αρχείου. Δεν έχει γίνει ακόμη επαναφορά.',
  refused: {
    unreadable: 'Δεν ήταν δυνατή η ανάγνωση του αρχείου. Δεν άλλαξε τίποτα.',
    too_large:
      'Το αρχείο είναι πολύ μεγάλο για αντίγραφο ασφαλείας αυτής της εφαρμογής. Δεν άλλαξε τίποτα.',
    not_backup:
      'Αυτό το αρχείο δεν είναι αντίγραφο ασφαλείας του Math Adventure. Δεν άλλαξε τίποτα.',
    damaged:
      'Το αντίγραφο έχει φθαρεί ή δεν είναι ακριβώς όπως το έφτιαξε η εφαρμογή. Δεν άλλαξε τίποτα.',
    newer_version:
      'Το αντίγραφο φτιάχτηκε από νεότερη έκδοση της εφαρμογής. Δεν άλλαξε τίποτα.',
    incompatible:
      'Το αντίγραφο φτιάχτηκε με διαφορετικές δραστηριότητες ή κανόνες, οπότε αυτή η έκδοση δεν μπορεί να το χρησιμοποιήσει με ασφάλεια. Δεν άλλαξε τίποτα.',
    invalid_contents:
      'Το αντίγραφο περιέχει κάτι που αυτή η έκδοση δεν μπορεί να δεχτεί. Δεν άλλαξε τίποτα.',
  },
  previewHeading: 'Έλεγχος πριν από την επαναφορά',
  previewIntro:
    'Το αρχείο πέρασε τους ελέγχους αυτής της έκδοσης. Δεν έχει γίνει ακόμη επαναφορά.',
  worlds: {
    original: 'Αρχικές δραστηριότητες',
    growing: 'Κόσμος που μεγαλώνει',
  },
  fields: {
    world: 'Αποθηκευμένος κόσμος',
    screenLanguage: 'Γλώσσα οθόνης',
    instructionLanguage: 'Γλώσσα οδηγιών',
    numberLanguage: 'Γλώσσα εκφώνησης αριθμών',
    mode: 'Επιλογή παιχνιδιού',
    activity: 'Συνέχεια με',
    session: 'Συνεδρία',
    finished: 'Ολοκληρωμένες δραστηριότητες',
    independent: 'Ανεξάρτητες επιτυχίες',
    supported: 'Επιτυχίες με βοήθεια ή νέα προσπάθεια',
    worked: 'Λυμένα παραδείγματα (μάθηση με βοήθεια, όχι ανεξάρτητα)',
    confirmations:
      'Επαναλαμβανόμενες ανεξάρτητες επιτυχίες που επιβεβαιώνουν μια σχέση (όχι νέα περίπτωση)',
    notYet: 'Όχι ακόμη',
    notCounted:
      'Απαντήσεις που δεν μετρούν ως στοιχεία (για παράδειγμα επαναλήψεις ή απλούστερη μορφή δραστηριότητας)',
    accomplishments: 'Πειραματικές καταστάσεις εξάσκησης (όχι μέτρηση γνώσεων)',
    discoveries:
      'Ανακαλύψεις που δοκιμάστηκαν ανεξάρτητα με διαφορετικούς τρόπους',
    help: 'Βοήθεια που αποθηκεύτηκε στην τελευταία συνεδρία',
  },
  modes: {
    manual: 'Απλώς παιχνίδι',
    'synthetic-policy': 'Καθοδηγούμενη εξάσκηση',
  },
  sessionOpen: 'ανοιχτή',
  sessionStopped: 'σταματημένη',
  states: {
    Emerging: 'η εξάσκηση ξεκίνησε',
    Developing: 'αναπτύσσεται στην εξάσκηση',
    Secure: 'σταθερό στην εξάσκηση (πειραματικός κανόνας)',
  },
  none: 'καμία',
  destination: {
    checking: 'Γίνεται έλεγχος αυτού του προγράμματος περιήγησης…',
    available:
      'Δεν υπάρχει αποθηκευμένο σήμα σε αυτό το πρόγραμμα περιήγησης, οπότε το αντίγραφο μπορεί να επαναφερθεί εδώ.',
    occupied:
      'Αυτό το πρόγραμμα περιήγησης έχει ήδη αποθηκευμένα σήματα. Η επαναφορά γίνεται μόνο όπου δεν υπάρχει αποθηκευμένο σήμα, οπότε δεν θα αλλάξει τίποτα εδώ.',
    unavailable:
      'Η αποθήκευση δεν είναι διαθέσιμη τώρα σε αυτό το πρόγραμμα περιήγησης, οπότε η επαναφορά δεν μπορεί να ξεκινήσει. Δεν άλλαξε τίποτα.',
  },
  closesBadge:
    'Μετά την επαναφορά, ένα σήμα ανοιχτό σε αυτό το παράθυρο κλείνει και ό,τι παίχτηκε χωρίς αποθήκευση χάνεται. Επιλέξτε ξανά σήμα μετά.',
  restore: 'Επαναφορά αυτών των σημάτων',
  cancel: 'Ακύρωση',
  cancelled: 'Η επαναφορά ακυρώθηκε. Δεν άλλαξε τίποτα.',
  restoring: 'Γίνεται επαναφορά. Κρατήστε αυτή τη σελίδα ανοιχτή…',
  restored:
    'Η επαναφορά ολοκληρώθηκε και ελέγχθηκε. Αυτά τα σήματα είναι τώρα αποθηκευμένα σε αυτό το πρόγραμμα περιήγησης. Επιλέξτε σήμα για να συνεχίσετε. Το αρχείο αντιγράφου παραμένει χωριστό αντίγραφο.',
  notRestored: {
    occupied:
      'Ένα σήμα αποθηκεύτηκε πρώτα εδώ από άλλο παράθυρο. Δεν έγινε επαναφορά ούτε αντικατάσταση.',
    changed:
      'Τα αποθηκευμένα σήματα άλλαξαν σε άλλο παράθυρο κατά την επαναφορά, για παράδειγμα διαγράφηκε ένα. Δεν έγινε επαναφορά ούτε αντικατάσταση. Ελέγξτε ξανά αυτό το πρόγραμμα περιήγησης πριν από την επαναφορά.',
    quota:
      'Δεν υπάρχει αρκετός χώρος αποθήκευσης σε αυτό το πρόγραμμα περιήγησης. Δεν έγινε επαναφορά.',
    unavailable:
      'Δεν ήταν δυνατή η αποθήκευση της επαναφοράς. Δεν έγινε επαναφορά.',
    blocked:
      'Μια αποθήκευση ή ενημέρωση βρίσκεται ακόμη σε εξέλιξη. Περιμένετε να ολοκληρωθεί και δοκιμάστε ξανά.',
    differs:
      'Τα αποθηκευμένα σήματα εδώ διαφέρουν από αυτό το αντίγραφο, για παράδειγμα επειδή το παιχνίδι συνεχίστηκε μετά την επαναφορά ή επειδή άλλο παράθυρο τα άλλαξε. Η επαναφορά δεν αντικαθιστά ποτέ αποθηκευμένα σήματα. Επιλέξτε σήμα για να δείτε τι είναι αποθηκευμένο.',
    absent:
      'Κανένα σήμα από αυτό το αντίγραφο δεν είναι τώρα αποθηκευμένο σε αυτό το πρόγραμμα περιήγησης και τίποτα δεν αντικαταστάθηκε. Ελέγξτε ξανά αυτό το πρόγραμμα περιήγησης πριν από την επαναφορά.',
  },
  checkBrowser: 'Ελέγξτε ξανά αυτό το πρόγραμμα περιήγησης',
  uncertain:
    'Δεν ήταν δυνατή η επιβεβαίωση του αποτελέσματος. Δεν αντικαταστάθηκε τίποτα. Ελέγξτε ξανά για να δείτε τι είναι αποθηκευμένο.',
  checkAgain: 'Έλεγχος ξανά',
  badges: { star: 'Αστέρι', triangle: 'Τρίγωνο' },
};

const german: BackupCopy = {
  heading: 'Dieses Abenteuer behalten',
  intro:
    'Speichern Sie eine Sicherungsdatei der Zeichen, die in diesem Browser gespeichert sind, oder holen Sie eine Sicherung in einen Browser zurück, in dem noch kein Zeichen gespeichert ist.',
  kindsHeading: 'Speichern, Sicherungen und Offline-Nutzung',
  kinds: [
    'Das Speichern im Browser behält Stern und Dreieck in diesem Browser auf diesem Gerät. Ein Browser kann gespeicherte Daten verlieren, zum Beispiel wenn seine Websitedaten gelöscht werden.',
    'Eine Sicherungsdatei ist eine getrennte Kopie, die Sie aufbewahren. Die App lädt sie nirgendwohin hoch.',
    'Offline-Nutzung verwendet App-Dateien, die dieser Browser gespeichert hat. Das ist keine Sicherung.',
    'Offline-Sprachausgabe hängt von den Stimmen auf diesem Gerät ab. Stimmen gehören nicht zu einer Sicherung.',
  ],
  containsHeading: 'Was eine Sicherung enthält',
  contains: [
    'Jedes gespeicherte Zeichen, Stern oder Dreieck, mit seinen Spracheinstellungen.',
    'Abgeschlossene Aufgaben und, für Übung, die als Nachweis zählt, welche Antworten selbstständig waren, welche Hilfe, ein gelöstes Beispiel oder einen weiteren Versuch brauchten und welche noch einmal angeschaut werden sollten.',
    'Entdeckungen, Fortschritt bei Vorschlägen, die Spielwahl und die Aufgabe, mit der es weitergeht.',
    'Versionsangaben, damit eine spätere Version die Datei vor der Verwendung prüfen kann.',
  ],
  excludesHeading: 'Was eine Sicherung nicht enthält',
  excludes: [
    'Bewegungen in der Entdecken-Werkstatt. Entdecken wird nie gespeichert.',
    'Spielen bei ausgeschaltetem Speichern und eine Antwort, deren Speicherung noch nicht abgeschlossen war.',
    'Die internen Speicherzähler und Sicherheitsvermerke dieses Browsers. Eine wiederhergestellte Kopie erhält neue.',
    'Stimmen, Offline-Dateien der App, Namen, Konten oder Daten anderer Websites.',
  ],
  privacy:
    'Die Datei ist eine private Kopie dieser synthetischen Testdaten. Wer die Datei hat, kann sie lesen. Bewahren Sie sie daher an einem Ort auf, den Sie kontrollieren. Sie bleibt von der App getrennt: Wenn Sie hier gespeicherte Zeichen löschen, wird die Datei nicht gelöscht, und die App kann von Ihnen angelegte Kopien nicht löschen.',
  checksum:
    'Eine Prüfsumme in der Datei erkennt versehentliche Beschädigung. Sie ist kein Passwort, keine Verschlüsselung und kein Nachweis, wer die Datei erstellt hat.',
  backupHeading: 'Sicherung erstellen',
  prepare: 'Sicherung vorbereiten',
  preparing: 'Die Sicherung wird vorbereitet und geprüft…',
  nothingSaved:
    'In diesem Browser ist noch kein Zeichen gespeichert, daher gibt es nichts zu sichern.',
  backupFailed:
    'Die Sicherung konnte nicht vorbereitet werden. Es wurde nichts geändert.',
  ready:
    'Die Sicherung ist bereit und wurde erfolgreich zurückgelesen. Sie enthält:',
  pendingExcluded:
    'Eine Antwort, deren Speicherung noch nicht abgeschlossen war, ist nicht enthalten. Die Sicherung enthält den letzten abgeschlossenen Speicherstand dieses Zeichens; die unvollständige Antwort bleibt nur in diesem Browser.',
  saveFile: 'Sicherungsdatei speichern',
  fileName: 'Dateiname',
  saveRequested:
    'Der Browser wurde gebeten, die Datei zu speichern. Prüfen Sie, ob sie in Ihren Downloads oder im gewählten Ordner erscheint, bevor Sie sich darauf verlassen. Erneutes Speichern legt eine weitere Kopie an.',
  restoreHeading: 'Sicherung wiederherstellen',
  restoreIntro:
    'Wiederherstellen funktioniert nur dort, wo noch kein Zeichen gespeichert ist, zum Beispiel in einem neuen Browser oder nachdem beide Zeichen gelöscht wurden. Gespeicherte Zeichen werden nie ersetzt oder vermischt. Stern kommt als Stern zurück und Dreieck als Dreieck.',
  chooseFile: 'Sicherungsdatei auswählen',
  checkingFile: 'Die Datei wird geprüft. Noch wurde nichts wiederhergestellt.',
  refused: {
    unreadable:
      'Die Datei konnte nicht gelesen werden. Es wurde nichts geändert.',
    too_large:
      'Diese Datei ist zu groß für eine Sicherung dieser App. Es wurde nichts geändert.',
    not_backup:
      'Diese Datei ist keine Math-Adventure-Sicherung. Es wurde nichts geändert.',
    damaged:
      'Diese Sicherung ist beschädigt oder nicht genau so, wie die App sie erstellt hat. Es wurde nichts geändert.',
    newer_version:
      'Diese Sicherung wurde mit einer neueren Version der App erstellt. Es wurde nichts geändert.',
    incompatible:
      'Diese Sicherung wurde mit anderen Aufgaben oder Regeln erstellt, daher kann diese Version sie nicht sicher verwenden. Es wurde nichts geändert.',
    invalid_contents:
      'Diese Sicherung enthält etwas, das diese Version nicht annehmen kann. Es wurde nichts geändert.',
  },
  previewHeading: 'Vor dem Wiederherstellen prüfen',
  previewIntro:
    'Die Datei hat die Prüfungen dieser Version bestanden. Noch wurde nichts wiederhergestellt.',
  worlds: { original: 'Ursprüngliche Aufgaben', growing: 'Wachsende Welt' },
  fields: {
    world: 'Gespeicherte Welt',
    screenLanguage: 'Bildschirmsprache',
    instructionLanguage: 'Sprache der Anleitungen',
    numberLanguage: 'Sprache der Zahlenansage',
    mode: 'Spielwahl',
    activity: 'Weiter mit',
    session: 'Sitzung',
    finished: 'Abgeschlossene Aufgaben',
    independent: 'Selbstständige Erfolge',
    supported: 'Erfolge mit Hilfe oder weiterem Versuch',
    worked: 'Gelöste Beispiele (Lernen mit Hilfe, nicht selbstständig)',
    confirmations:
      'Wiederholte selbstständige Erfolge, die eine Beziehung bestätigen (kein neuer Fall)',
    notYet: 'Noch nicht',
    notCounted:
      'Antworten, die nicht als Nachweis zählen (zum Beispiel Wiederholungen oder eine einfachere Form einer Aufgabe)',
    accomplishments: 'Experimentelle Übungsstände (kein Maß für Beherrschung)',
    discoveries:
      'Entdeckungen, die selbstständig auf verschiedene Weise ausprobiert wurden',
    help: 'In der letzten Sitzung gespeicherte Hilfe',
  },
  modes: { manual: 'Einfach spielen', 'synthetic-policy': 'Begleitetes Üben' },
  sessionOpen: 'offen',
  sessionStopped: 'beendet',
  states: {
    Emerging: 'Üben hat begonnen',
    Developing: 'entwickelt sich beim Üben',
    Secure: 'beständig beim Üben (experimentelle Regel)',
  },
  none: 'keine',
  destination: {
    checking: 'Dieser Browser wird geprüft…',
    available:
      'In diesem Browser ist kein Zeichen gespeichert, daher kann die Sicherung hier wiederhergestellt werden.',
    occupied:
      'In diesem Browser sind bereits Zeichen gespeichert. Wiederherstellen ist nur dort möglich, wo kein Zeichen gespeichert ist, daher wird hier nichts geändert.',
    unavailable:
      'Speichern ist in diesem Browser gerade nicht verfügbar, daher kann das Wiederherstellen nicht beginnen. Es wurde nichts geändert.',
  },
  closesBadge:
    'Nach dem Wiederherstellen wird ein in diesem Fenster geöffnetes Zeichen geschlossen, und Spielen ohne Speichern geht verloren. Wählen Sie danach wieder ein Zeichen.',
  restore: 'Diese Zeichen wiederherstellen',
  cancel: 'Abbrechen',
  cancelled: 'Wiederherstellen abgebrochen. Es wurde nichts geändert.',
  restoring: 'Wird wiederhergestellt. Lassen Sie diese Seite geöffnet…',
  restored:
    'Wiederhergestellt und geprüft. Diese Zeichen sind jetzt in diesem Browser gespeichert. Wählen Sie ein Zeichen, um weiterzumachen. Ihre Sicherungsdatei bleibt eine getrennte Kopie.',
  notRestored: {
    occupied:
      'In einem anderen Fenster wurde hier zuerst ein Zeichen gespeichert. Es wurde nichts wiederhergestellt oder ersetzt.',
    changed:
      'Gespeicherte Zeichen haben sich während des Wiederherstellens in einem anderen Fenster geändert, zum Beispiel wurde eines gelöscht. Es wurde nichts wiederhergestellt oder ersetzt. Prüfen Sie diesen Browser erneut, bevor Sie wiederherstellen.',
    quota:
      'In diesem Browser ist nicht genug Speicherplatz frei. Es wurde nichts wiederhergestellt.',
    unavailable:
      'Das Wiederherstellen konnte nicht gespeichert werden. Es wurde nichts wiederhergestellt.',
    blocked:
      'Ein Speichervorgang oder eine Aktualisierung läuft noch. Warten Sie, bis er fertig ist, und versuchen Sie es dann erneut.',
    differs:
      'Die hier gespeicherten Zeichen unterscheiden sich von dieser Sicherung, zum Beispiel weil nach dem Wiederherstellen weitergespielt wurde oder ein anderes Fenster sie geändert hat. Wiederherstellen ersetzt nie gespeicherte Zeichen. Wählen Sie ein Zeichen, um zu sehen, was gespeichert ist.',
    absent:
      'Kein Zeichen aus dieser Sicherung ist jetzt in diesem Browser gespeichert, und nichts wurde ersetzt. Prüfen Sie diesen Browser erneut, bevor Sie wiederherstellen.',
  },
  checkBrowser: 'Diesen Browser erneut prüfen',
  uncertain:
    'Das Ergebnis konnte nicht bestätigt werden. Es wurde nichts überschrieben. Prüfen Sie erneut, was gespeichert ist.',
  checkAgain: 'Erneut prüfen',
  badges: { star: 'Stern', triangle: 'Dreieck' },
};

const copies = { 'el-GR': greek, 'en-GB': english, 'de-DE': german } as const;

export function backupCopy(locale: Locale): BackupCopy {
  return copies[resolvePrototypeLocale(locale).effectiveLocale];
}
