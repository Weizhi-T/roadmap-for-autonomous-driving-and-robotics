/** Dependency-free checks for metadata, content, links and generated-file drift. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://weizhi-t.github.io/roadmap-for-autonomous-driving-and-robotics/';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = { window: {} };
vm.runInNewContext(read('data.js'), context, { timeout: 2000 });
const { zh, en } = context.window.ATLAS_I18N;
const stages = zh.stages.map(s => s.id);
const nodes = new Set(zh.stages.flatMap(s => s.categories.flatMap(c => c.leaves.map(n => n.id))));
const pages = ['index.html', 'guides/index.html', ...stages.map(id => `guides/${id}/index.html`)];
const titles = new Set(), descriptions = new Set();
let internalLinks = 0;
for (const file of pages) {
  const html = read(file);
  const expected = base + file.replace(/index\.html$/, '');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one initial h1`);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, `${file}: one canonical`);
  assert.ok(html.includes(`<link rel="canonical" href="${expected}">`), `${file}: canonical`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  assert.ok(title && !titles.has(title), `${file}: unique title`); titles.add(title);
  assert.ok(description && !descriptions.has(description), `${file}: unique description`); descriptions.add(description);
  assert.ok(html.includes('lang="en"') && html.includes('lang="zh-CN"'), `${file}: both languages`);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (/^https?:/.test(href)) continue;
    const [withQuery, fragment = ''] = href.split('#');
    const relative = withQuery.split('?')[0];
    let target = path.resolve(root, path.dirname(file), relative || path.basename(file));
    if (relative.endsWith('/')) target = path.join(target, 'index.html');
    assert.ok(target.startsWith(root + path.sep), `${file}: local link stays in site`);
    assert.ok(fs.existsSync(target), `${file}: missing target ${href}`);
    if (fragment.startsWith('node/')) assert.ok(nodes.has(fragment.slice(5)), `${file}: method ${href}`);
    else if (fragment.startsWith('stage/')) assert.ok(stages.includes(fragment.slice(6)), `${file}: stage ${href}`);
    else if (fragment && !['home','guide'].includes(fragment)) assert.ok(fs.readFileSync(target, 'utf8').includes(`id="${fragment}"`), `${file}: anchor ${href}`);
    internalLinks++;
  }
}
for (const stage of zh.stages) {
  const page = read(`guides/${stage.id}/index.html`);
  assert.equal((page.match(/<article id="method-/g) || []).length, stage.categories.flatMap(c => c.leaves).length);
  assert.ok(!/<script\s+src=/.test(page), 'Guides must not require JavaScript');
  for (const locale of [zh, en]) for (const c of locale.stages.find(s => s.id === stage.id).categories) for (const n of c.leaves) {
    assert.ok(page.includes(`id="method-${n.id}"`), n.id);
    assert.ok(n.body.length > 0, n.id + ' must contain real explanations');
  }
}
const sitemap = read('sitemap.xml');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(locations, pages.map(file => base + file.replace(/index\.html$/, '')));
assert.ok(locations.every(url => !url.includes('#')));
const home = read('index.html');
assert.ok(home.includes('name="google-site-verification"'));
assert.ok(home.includes('generated:atlas-summary:start'));
assert.ok(read('app.js').includes('repositoryCommunity()'));

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-discovery-'));
try {
  fs.mkdirSync(path.join(temporary, 'scripts'));
  for (const file of ['data.js','index.html','scripts/generate-guides.mjs']) fs.copyFileSync(path.join(root,file), path.join(temporary,file));
  execFileSync(process.execPath, [path.join(temporary,'scripts/generate-guides.mjs')]);
  for (const file of [...pages, 'sitemap.xml']) assert.equal(fs.readFileSync(path.join(temporary,file),'utf8'), read(file), `${file}: stale generated content; run node scripts/generate-guides.mjs`);
} finally { fs.rmSync(temporary, { recursive:true, force:true }); }
console.log(`PASS: ${pages.length} pages, ${nodes.size} bilingual methods, ${internalLinks} internal links, metadata, sitemap and deterministic regeneration.`);
