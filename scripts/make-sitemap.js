#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { validateCatalog } = require('../js/app.js');
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://allegendpl.github.io/Homeworkcalculusextreme/';
function xml(value) { return value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]); }
function createSitemap(games, base = BASE_URL) {
  const parsed = new URL(base);
  if (parsed.protocol !== 'https:' || !base.endsWith('/')) throw new Error('Sitemap base must be an HTTPS URL ending with /.');
  validateCatalog(games);
  const pages = ['index.html', 'stats.html', 'about.html', 'privacy.html', 'dmca.html', 'contact.html'];
  const entries = pages.map(p => ({ url: new URL(p, base).href }));
  games.forEach(g => entries.push({ url: new URL(`game.html?id=${encodeURIComponent(g.id)}`, base).href, date: g.addedAt.slice(0, 10) }));
  if (entries.length > 50000) throw new Error('More than 50,000 URLs requires a sitemap index.');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.map(e => `  <url><loc>${xml(e.url)}</loc>${e.date ? `<lastmod>${e.date}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n';
}
async function makeSitemap({ input = path.join(ROOT, 'data/games.json'), output = path.join(ROOT, 'sitemap.xml'), base = BASE_URL } = {}) {
  const text = createSitemap(JSON.parse(await fs.readFile(input, 'utf8')), base);
  if (Buffer.byteLength(text) > 50 * 1024 * 1024) throw new Error('Sitemap exceeds protocol size limit.');
  await fs.writeFile(output, text); return output;
}
if (require.main === module) makeSitemap().then(() => console.log('Generated sitemap.xml.')).catch(error => { console.error(`Sitemap failed: ${error.message}`); process.exitCode = 1; });
module.exports = { createSitemap, makeSitemap, BASE_URL };
