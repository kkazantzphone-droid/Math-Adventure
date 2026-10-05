import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/App';

describe('technical application shell', () => {
  it('renders a main landmark, a named heading and truthful phase status', () => {
    const markup = renderToStaticMarkup(<App />);
    expect(markup).toMatch(/^<main>/);
    expect(markup).toContain('<h1>Math Adventure</h1>');
    expect(markup).toContain('Technical foundation — Phase 1A');
    expect(markup).toContain('The game is not implemented yet.');
    expect(markup).not.toMatch(/<(button|a|input)\b/);
  });
});
