import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', name), 'utf8'));
const errors = [];
const required = (object, fields, label) => {
  for (const field of fields) if (!(field in object)) errors.push(`${label}: 缺少欄位 ${field}`);
};
const uniqueIds = (rows, label) => {
  const seen = new Set();
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { errors.push(`${label}[${index}] 必須是物件`); return; }
    required(row, ['id'], `${label}[${index}]`);
    if (seen.has(row.id)) errors.push(`${label}: 重複 id ${row.id}`);
    seen.add(row.id);
  });
  return seen;
};
const products = load('products.json');
const npcs = load('npcs.json');
const productIds = uniqueIds(products, 'products');
const npcIds = uniqueIds(npcs, 'npcs');
products.forEach((p, i) => {
  const label = `products[${i}]`;
  required(p, ['id', 'ms', 'msVariants', 'zh', 'emoji', 'category', 'unlockLevel', 'buyPrice', 'refPrice'], label);
  if (typeof p.reviewed !== 'boolean') errors.push(`${label}: reviewed 必須是布林值`);
});
npcs.forEach((n, i) => {
  const label = `npcs[${i}]`;
  required(n, ['id', 'name', 'role', 'personality', 'reviewed'], label);
  if (typeof n.reviewed !== 'boolean') errors.push(`${label}: reviewed 必須是布林值`);
});
const expectKinds = new Set(['text', 'choice', 'number', 'item', 'price', 'any']);
const encounters = ['encounters.p1.json', 'encounters.p2.json', 'encounters.p3.json'].flatMap(load);
uniqueIds(encounters, 'encounters');
encounters.forEach((e, i) => {
  const label = `encounters[${i}]`;
  required(e, ['id', 'type', 'phase', 'minLevel', 'speaker', 'lines', 'expect', 'success', 'fail', 'vocab', 'hint'], label);
  if (e.expect && !expectKinds.has(e.expect.kind)) errors.push(`${label}: 不合法的 expect.kind ${e.expect.kind}`);
  if (!npcIds.has(e.speaker)) errors.push(`${label}: 懸空 NPC 參照 ${e.speaker}`);
  if (e.expect?.productId && !productIds.has(e.expect.productId)) errors.push(`${label}: 懸空商品參照 ${e.expect.productId}`);
  for (const id of e.vocab ?? []) if (!productIds.has(id)) errors.push(`${label}: vocab 懸空商品參照 ${id}`);
  for (const line of e.lines ?? []) if (typeof line.ms !== 'string' || typeof line.zh !== 'string' || typeof line.reviewed !== 'boolean') errors.push(`${label}: lines 每項須含 ms、zh、reviewed`);
});
for (const [name, min] of [['encounters.p1.json', 40], ['encounters.p2.json', 15], ['encounters.p3.json', 10]]) {
  if (load(name).length < min) errors.push(`${name}: 至少需要 ${min} 筆`);
}
for (const [name, min] of [['days.json', 30], ['events.json', 1], ['exam.json', 20]]) {
  if (load(name).length < min) errors.push(`${name}: 至少需要 ${min} 筆`);
}
const phrases = load('phrases.json');
uniqueIds(phrases, 'phrases');
phrases.forEach((p, i) => { required(p, ['id', 'phase', 'ms', 'zh', 'reviewed'], `phrases[${i}]`); if (p.reviewed !== false) errors.push(`phrases[${i}]: reviewed 必須為 false`); });
for (const file of ['days.json', 'events.json', 'exam.json']) {
  const rows = load(file);
  rows.forEach((row, i) => {
    required(row, ['id'], `${file}[${i}]`);
    if (row.reviewed !== false) errors.push(`${file}[${i}]: reviewed 必須為 false`);
  });
}
if (errors.length) { console.error(`資料驗證失敗（${errors.length} 項）：\n- ${errors.join('\n- ')}`); process.exitCode = 1; }
else console.log(`資料驗證通過：${products.length} 商品、${npcs.length} NPC、${encounters.length} 互動、${load('days.json').length} 日劇情。`);
