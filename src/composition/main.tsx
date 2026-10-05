import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../ui/App';
import { prototypeCopy } from '../ui/prototype/copy';
import { parsePrototypeLanguage } from '../ui/prototype/options';
import '../ui/styles.css';

const container = document.getElementById('root');
const language = parsePrototypeLanguage(window.location.search);
document.documentElement.lang = prototypeCopy[language].locale;

if (container === null) {
  throw new Error('The application root element is missing.');
}

createRoot(container).render(
  <StrictMode>
    <App language={language} />
  </StrictMode>,
);
