#!/usr/bin/env node
/* Node 22+, built-ins only. Never scrapes game sites or downloads game files. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { validateCatalog } = require('../js/app.js');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data/games.json');
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_GAMES = 20000;

/* OWNER CONFIGURATION — these are GENERIC sample fields, NOT a claim about any
 * publisher's API. Obtain the official JSON feed docs and distribution agreement.
 * Change ONLY this small function to match that feed's envelope/fields/auth.
 * Default input: array, or {games:[...]} in our catalog-like format.
 * Default authentication: Authorization: Bearer <FEED_KEY>. If the real feed uses
 * x-api-key, query authentication, etc., change request here per its official docs.
 * Never log request URLs, headers, key values, or raw provider error bodies.
 * source/license must reflect documented rights, NOT an invented blanket license.
 * A publisher program is not MIT: retain its official embed/SDK and revenue share.
 * XML feeds need a documented JSON endpoint or a separately reviewed parser.
 */
function mapLicensedFeed(payload, key) {
  return {
    request: { headers: { Accept: 'application/json', Authorization: `Bearer ${key}` } },
    games: payload === undefined ? [] : (Array.isArray(payload) ? payload : payload?.games),
    map: row => ({
      id: row.id, title: row.title, category: row.category,
      tags: row.tags ?? [], description: row.description, controls: row.controls,
      ...(row.note ? { note: row.note } : {}),
      thumbnail: row.thumbnail, embedUrl: row.embedUrl,
      source: row.source, license: row.license,
      isNew: row.isNew ?? false, addedAt: row.addedAt
    })
  };
}
function slug(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function plain(value) { return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : ''; }
function normalizeGame(raw, previous, now) {
  const id = slug(raw.id || raw.title);
  if (!id) throw new Error('A feed entry has no usable slug. Adjust the field mapping.');
  const old = previous.get(id);
  const g = {
    id, title: plain(raw.title), category: plain(raw.category) || 'Arcade',
    tags: (Array.isArray(raw.tags) ? raw.tags : typeof raw.tags === 'string' ? raw.tags.split(',') : []).map(plain).filter(Boolean),
    description: plain(raw.description), controls: plain(raw.controls),
    thumbnail: plain(raw.thumbnail), embedUrl: plain(raw.embedUrl),
    source: plain(raw.source), license: plain(raw.license),
    isNew: raw.isNew === true || raw.isNew === 'true',
    addedAt: raw.addedAt ? new Date(raw.addedAt).toISOString() : old?.addedAt || now
  };
  if (raw.note) g.note = plain(raw.note);
  for (const field of ['thumbnail', 'embedUrl']) {
    const url = new URL(g[field]);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Feed thumbnail and embed URLs must be public HTTPS URLs, without credentials.');
  }
  return g;
}
async function readResponse(response) {
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}. Check official feed access and mapping.`);
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Feed exceeds 20 MiB limit.');
  if (!response.body) throw new Error('Feed response is empty.');
  const parts = []; let bytes = 0;
  for await (const part of response.body) { bytes += part.byteLength; if (bytes > MAX_BYTES) throw new Error('Feed exceeds 20 MiB limit.'); parts.push(Buffer.from(part)); }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new Error('Feed is not valid JSON. Adjust the documented feed format before importing.'); }
}
async function importFeed({ env = process.env, fetchFn = fetch, output = OUTPUT, now = new Date().toISOString() } = {}) {
  if (!env.FEED_URL || !env.FEED_KEY) throw new Error('Set FEED_URL and FEED_KEY from your approved publisher program. See README.md and mapLicensedFeed(). Existing catalog is unchanged.');
  let url;
  try { url = new URL(env.FEED_URL); } catch { throw new Error('FEED_URL must be a valid HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('FEED_URL must use HTTPS without inline credentials.');
  let existing = [];
  try { existing = validateCatalog(JSON.parse(await fs.readFile(output, 'utf8'))); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Existing catalog is invalid; refusing to overwrite it.'); }
  const config = mapLicensedFeed(undefined, env.FEED_KEY);
  let payload;
  try {
    const response = await fetchFn(url.href, { ...config.request, redirect: 'error', signal: AbortSignal.timeout(45000) });
    payload = await readResponse(response);
  } catch (error) {
    // Only our safe errors may be shown: transport errors can include secret URLs.
    if (/^Feed (returned HTTP|exceeds|response is empty|is not valid JSON)/.test(error.message)) throw error;
    throw new Error('Feed request failed, timed out, or redirected. Check FEED_URL, authentication mapping, and network access. Existing catalog is unchanged.');
  }
  const mapped = mapLicensedFeed(payload, env.FEED_KEY);
  if (!Array.isArray(mapped.games) || !mapped.games.length || mapped.games.length > MAX_GAMES) throw new Error('Feed must map to 1–20,000 games. Empty/malformed feed will not erase the catalog.');
  const previous = new Map(existing.map(g => [g.id, g]));
  let imported;
  try { imported = mapped.games.map(row => normalizeGame(mapped.map(row), previous, now)); validateCatalog(imported); }
  catch { throw new Error('A feed entry has missing/invalid fields, rights credits, dates, URLs, or duplicate slugs. Review mapLicensedFeed(); nothing was written.'); }
  // Preserve only bundled local entries. Removed publisher entries disappear on
  // the next successful import, rather than retaining revoked embeds forever.
  const bundled = existing.filter(g => g.embedUrl.startsWith('games/'));
  if (imported.some(g => bundled.some(local => local.id === g.id))) throw new Error('Feed slug collides with a bundled game. Adjust the mapping; catalog unchanged.');
  const combined = [...bundled, ...imported]; validateCatalog(combined);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const temp = `${output}.${process.pid}.tmp`;
  try { await fs.writeFile(temp, JSON.stringify(combined, null, 2) + '\n', { flag: 'wx' }); await fs.rename(temp, output); }
  finally { await fs.rm(temp, { force: true }); }
  return { imported: imported.length, total: combined.length };
}
if (require.main === module) importFeed().then(result => console.log(`Imported ${result.imported} licensed feed entries; ${result.total} total games.`)).catch(error => { console.error(`Import failed: ${error.message}`); process.exitCode = 1; });
module.exports = { importFeed, mapLicensedFeed, normalizeGame, slug };
