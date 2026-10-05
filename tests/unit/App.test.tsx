import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/App';

describe('prototype application entry', () => {
  it('renders a main landmark, badge selection and truthful unsaved prototype status', () => {
    const markup = renderToStaticMarkup(<App language="en" />);
    expect(markup).toMatch(/^<main\b/);
    expect(markup).toContain('Math Adventure');
    expect(markup).toContain('Choose your badge');
    expect(markup).toContain('Prototype — progress is not saved');
    expect(markup.match(/<button\b/g)).toHaveLength(2);
    expect(markup).not.toContain('Technical foundation');
  });
});
