import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('application wiring', () => {
  it('boots through the small app entry point', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.js'), 'utf8');
    expect(main.split('\n').length).toBeLessThan(20);
    expect(main).toContain("import './app.js'");
  });

  it('keeps game rules in the engine and uses DOM-safe rendering', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/app.js'), 'utf8');
    expect(app).toContain("from './engine/game.js'");
    expect(app).not.toMatch(/\.innerHTML\s*=/);
  });
});
