import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', name), 'utf8'));
describe('M1 seed data', () => {
  it('contains the required product, character, encounter, day, and exam seeds', () => {
    expect(read('products.json')).toHaveLength(37);
    expect(read('npcs.json')).toHaveLength(10);
    expect(read('encounters.p1.json')).toHaveLength(40);
    expect(read('encounters.p2.json')).toHaveLength(15);
    expect(read('encounters.p3.json')).toHaveLength(10);
    expect(read('days.json')).toHaveLength(30);
    expect(read('exam.json').filter((q) => q.phase === 1)).toHaveLength(10);
    expect(read('exam.json').filter((q) => q.phase === 2)).toHaveLength(10);
  });
  it('passes the data validator', () => {
    expect(() => execFileSync(process.execPath, ['scripts/validate-data.js'], { cwd: root })).not.toThrow();
  });
  it('exports Malay dialogue grouped by phase with Chinese translations', () => {
    execFileSync(process.execPath, ['scripts/export-malay-review.js'], { cwd: root });
    const output = fs.readFileSync(path.join(root, 'docs/malay-review.md'), 'utf8');
    expect(output).toContain('初期（Phase 1）');
    expect(output).toContain('中期（Phase 2）');
    expect(output).toContain('高期（Phase 3）');
    expect(output).toContain('華語');
  });
});
