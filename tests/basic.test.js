import { describe, expect, it } from 'vitest';

describe('M0 test setup', () => {
  it('runs Vitest in jsdom', () => {
    expect(typeof window).toBe('object');
    expect(document.createElement('main').tagName).toBe('MAIN');
  });
});
