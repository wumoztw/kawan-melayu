import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', name), 'utf8'));
const groups = [
  ['初期（Phase 1）', [...data('phrases.json').filter((x) => x.phase === 1), ...data('encounters.p1.json').flatMap((x) => x.lines)]],
  ['中期（Phase 2）', [...data('phrases.json').filter((x) => x.phase === 2), ...data('encounters.p2.json').flatMap((x) => x.lines)]],
  ['高期（Phase 3）', [...data('phrases.json').filter((x) => x.phase === 3), ...data('encounters.p3.json').flatMap((x) => x.lines)]],
];
let output = '# 馬來文內容審閱表\n\n> 所有條目目前均為未審閱（reviewed: false）；請由母語者確認自然度與語境。\n';
for (const [heading, lines] of groups) {
  output += `\n## ${heading}\n\n| 馬來文 | 華語 | 審閱狀態 |\n|---|---|---|\n`;
  for (const item of lines) output += `| ${(item.ms ?? '').replaceAll('|', '\\|')} | ${(item.zh ?? '').replaceAll('|', '\\|')} | ${item.reviewed === false ? '待審閱' : '—'} |\n`;
}
fs.writeFileSync(path.join(root, 'docs/malay-review.md'), output);
process.stdout.write('已匯出 docs/malay-review.md\n');
