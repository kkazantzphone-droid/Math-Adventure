import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../ui/App';
import { getPrototypeCopy } from '../presentation/localisation/format';
import { parseLanguagePreferences } from '../presentation/localisation/preferences';
import { createBrowserSpeechAdapter } from '../infrastructure/speech/browserSpeech';
import '../ui/styles.css';
import { parseFamilyProofOptions } from '../ui/family-proof/options';

const container = document.getElementById('root');
const preferences = parseLanguagePreferences(window.location.search);
const familyProof = parseFamilyProofOptions(window.location.search);
const voiceCheckParameters = new URLSearchParams(window.location.search).getAll(
  'voiceCheck',
);
const voiceCheck =
  voiceCheckParameters.length === 1 && voiceCheckParameters[0] === '1';
document.documentElement.lang = getPrototypeCopy(preferences.uiLocale).locale;
const speech = createBrowserSpeechAdapter();
window.addEventListener('pagehide', () => speech.cancel());
const updateDocumentLanguage = (current: typeof preferences) => {
  document.documentElement.lang = getPrototypeCopy(current.uiLocale).locale;
};

if (container === null) {
  throw new Error('The application root element is missing.');
}

createRoot(container).render(
  <StrictMode>
    <App
      preferences={preferences}
      speech={speech}
      voiceCheck={voiceCheck}
      familyProof={familyProof}
      onPreferencesChange={updateDocumentLanguage}
    />
  </StrictMode>,
);
