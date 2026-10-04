import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<main id="app"></main>';
  localStorage.clear();
});

describe('rendered first-day flow', () => {
  it('plays the customer turn through the real DOM and saves progress', async () => {
    await import('../../src/app.js');
    document.querySelector('button[data-choice="1"]').click();
    expect(document.body.textContent).toContain('顧客想要');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(document.body.textContent).toContain('顧客回應：答對了！');
    const save = [...document.querySelectorAll('button')].find((button) => button.textContent === '儲存進度');
    save.click();
    expect(JSON.parse(localStorage.getItem('kawan:save')).day).toBe(2);
  });

  it('renders content as text, not executable markup', async () => {
    await import('../../src/app.js');
    expect(document.querySelector('#app script')).toBeNull();
    expect(document.querySelector('#app [data-choice="1"]')).not.toBeNull();
  });
});
