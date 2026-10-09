# ExtremeCalculus

A complete, static HTML5 games portal for **allegendpl/Homeworkcalculusextreme**.
Vanilla HTML, CSS, and JavaScript. **No backend, no framework, no build step, no runtime dependencies.**

Intended Pages URL: **https://allegendpl.github.io/Homeworkcalculusextreme/**

## Deploy to GitHub Pages, step by step

1. Upload this folder's contents to the **root** of `allegendpl/Homeworkcalculusextreme` on **main**. Include `index.html`, `.nojekyll`, and the `.github` directory, not an extra containing folder. Do not upload `.preview`, `node_modules`, `.env`, logs, keys, or test-feed files.
2. Open **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, **main**, **/(root)**, and Save.
3. Wait for GitHub's Pages deployment to finish, then visit the intended URL above. This repository's files are ready for Pages; generating or editing them does not itself publish them.
4. Open every page, start a game, save a favorite, and check Stats. Test at 360px width and at 1280px or wider for both ad rails.
5. If games or styling do not load after an update, inspect the browser console/network, clear site data, and reload. Bump `VERSION` in `sw.js` when shipping shell changes.

All app links, fetches, manifest paths, shell assets, and local embeds are relative. External publisher/attribution URLs and canonical/OG/sitemap metadata necessarily use full HTTPS URLs. There are **no root-relative `/asset` paths**. Serve over HTTP(S), not `file://` (fetch and service workers require an origin).

## Preview locally

Node 22+ includes a dependency-free server that also serves the project subpath:

```sh
node scripts/serve.js --host 0.0.0.0 --port 3000
```

Open `http://localhost:3000/Homeworkcalculusextreme/` to test Pages-style paths.

Alternatively, Python 3 is sufficient:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open `http://localhost:3000/`. For a project-site test, serve the containing directory or map this folder to `/Homeworkcalculusextreme/` with your static server. HTTPS or localhost is required for the service worker. No install is required for the site or Node scripts. Node **22+** is required for maintenance scripts and tests.

## What is included

- Black/orange responsive grid, live title/category/tag search, generated category filters, combined sorts, Random, favorites, and 48-card pagination.
- Sandboxed game player, fullscreen request, game controls/description, rights credits, related cards, and a real issue-tracker report link.
- Private device-local stats, theme preference, install prompt when supported, and an offline **portal shell**. External games and ad resources are not cached; gameplay offline is not promised.
- Reserved 160×600 left/right ad rails from 1280px, 300×600 from 1840px, and a 320×100 slot below 1280px. No fake creatives.
- About, Privacy, DMCA/removal, Contact, 404, manifest, icons, `.nojekyll`, and a generated sitemap.

### 204 games: five local starters + 199 official publisher embeds

The collection now has **204 distinct game entries and embed URLs**. Five local games are:

| Game | Author/source | Rights |
| --- | --- | --- |
| 2048 | Gabriele Cirulli | MIT; pinned upstream source, original copyright included |
| Neon Snake | ExtremeCalculus contributors | Original MIT code and artwork |
| Prism Breaker | ExtremeCalculus contributors | Original MIT code and artwork |
| Memory Mosaic | ExtremeCalculus contributors | Original MIT code and artwork |
| Lights Out | ExtremeCalculus contributors | Original MIT code and artwork |

`games/2048/provenance.md` records the upstream revision and small presentation changes.
`games/2048/LICENSE.txt` preserves the upstream MIT notice. `games/original/LICENSE.txt`
licenses the original mini-games. `thumbnails/LICENSE.txt` licenses the five original SVG
illustrations, which depict actual boards/mechanics, not emojis or commercial branding.

All five starter games are bundled locally. The additional **199 games** come from
GameMonetize’s official public publisher feeds for **QkyGames, Inlogic Software s.r.o.,
and Playtouch**. GameMonetize explicitly permits publisher embedding in its
[FAQ](https://gamemonetize.com/faq) and provides the official
[JSON/RSS feed builder](https://gamemonetize.com/rss-builder). These games are **not MIT**:
they remain copyrighted and use the provider’s hosted embeds, branding, SDKs, and ads.
No publisher game files or artwork are committed; thumbnails use the official image URLs.
See `data/SOURCES.md` for evidence and `data/feed-selection.json` for the reviewed allowlist.

Refresh this curated public collection, **no API key required**:

```sh
node scripts/import-feed.js --gamemonetize-public
node scripts/make-sitemap.js
node --test tests/*.test.js
```

The adapter uses only reviewed game IDs and verifies their pinned titles, embed URLs,
and thumbnail URLs. Newly published games are not automatically approved. Missing titles
are delisted; updates that would leave fewer than 200 total entries fail rather than
silently shrink the collection. Review and extend the allowlist if that happens. Changed
resource URLs or titles require another review. Register this site in a GameMonetize
publisher account to arrange revenue share; public-feed access does not configure payouts.
Permission to embed is not permission to download/repackage the games or remove ads.
All 199 selected thumbnail images decoded and all embeds returned HTML when checked;
that is **not** a completed gameplay or downstream-asset copyright audit.
The interface accepts 5 to 5,000+ entries and renders at most 48 new cards per Load more.
For additional open-source games, audit **code AND artwork/audio** licenses before copying
files, preserve all notices, and credit the author on the player. For written permissions,
keep the permission record. Never scrape other “unblocked” portals or copy commercial games.

## Connect an approved licensed feed

1. Apply to a legitimate game distribution program, such as **GameDistribution**. Get approved for this domain, and obtain the **official feed documentation**, credentials, embed/SDK instructions, thumbnail rights, advertising/revenue-share terms, and privacy disclosures. This project does not claim a specific publisher API format or access.
2. Inspect the small, commented **`mapLicensedFeed()` in `scripts/import-feed.js`**. Adapt its authentication headers, JSON envelope, and game fields to the **actual official format**. The sample is a generic JSON array or `{ "games": [...] }`, not a documented GameDistribution endpoint. Default authentication is Bearer solely as an adjustable example. Do not guess API endpoints or strip a publisher's SDK/ads. No XML parser or pagination is assumed; configure the provider's documented full JSON feed or extend the adapter for its documented pagination.
3. Supply meaningful `source` and `license` from the approved program/permission, including a terms reference when appropriate. Do not label publisher games “MIT” unless they actually are. Audit every import's permission and thumbnail rights; a feed field is not proof of a license. Update Privacy with the actual provider names and policies.
4. Set `FEED_URL` and `FEED_KEY` in your **private local environment**, then run:

   ```sh
   node scripts/import-feed.js
   node scripts/make-sitemap.js
   node --test tests/*.test.js
   ```

   Never put credentials in HTML, browser JS, committed config, chat, or examples. A private `.env` file is ignored, but is **not automatically loaded** by these scripts; use your environment/secrets manager (or Node's `--env-file` support with a private file).
5. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**. Add **FEED_URL** and **FEED_KEY** (exact names).
6. Enable Actions. For the already-configured public catalog, no secrets are necessary. To switch to your private approved feed, set both secrets and adapt the mapping as described above. `.github/workflows/update-games.yml` runs Mondays at 06:23 UTC and from **Actions → Update licensed games → Run workflow**. It checks out main, imports, regenerates the sitemap, tests, and commits `data/games.json` and `sitemap.xml` to **main**. The job has `contents: write`. Because `GITHUB_TOKEN` commits do not reliably retrigger Pages, the workflow explicitly requests a branch-based Pages rebuild with `pages: write`. Enable Pages first; that final step fails if Pages is not configured or policies disallow the request. Branch protections may require a reviewed PR instead; adjust the workflow to your governance rather than disabling protection.

The workflow uses the reviewed public GameMonetize feed when both secrets are absent. If you set either private-feed secret, it uses the configurable private adapter instead and requires both secrets. The default command without `--gamemonetize-public` still fails clearly when credentials are missing and leaves the catalog intact. HTTP/auth errors,
invalid JSON, duplicate IDs, malformed credits/URLs, empty feeds, redirect attempts, and
timeouts fail closed. Keys, provider URLs, and raw provider errors are not logged. Maximum
feed response: **20 MiB**, **20,000 entries**, **45 seconds** request timeout. Output is
validated before an atomic replacement. Local bundled games are preserved; old external
entries are replaced by the current feed so delisted games are not retained automatically.
Importing does not download game files or thumbnails.

### Catalog format

`data/games.json` is an array. Every entry uses:

```json
{
  "id": "example-game",
  "title": "Example Game",
  "category": "Puzzle",
  "tags": ["logic", "casual"],
  "description": "An accurate game description.",
  "controls": "Use the controls specified by its author.",
  "note": "Optional warning text.",
  "thumbnail": "thumbnails/example-game.svg",
  "embedUrl": "games/example-game/index.html",
  "source": "Actual author or licensed publisher",
  "license": "Actual license or documented distribution terms",
  "isNew": false,
  "addedAt": "2026-10-09T00:00:00Z"
}
```

This is schema documentation, **not a shipped playable catalog entry**. IDs are unique
lowercase ASCII slugs; tags are strings; `isNew` is a boolean; dates are ISO timestamps.
Catalog local URLs are relative to the **site root**, not `data/`. Imported thumbnails and
embeds must use HTTPS. The importer strips markup from prose, normalizes slugs/tags/dates,
and preserves a prior added date when the feed omits one. Slug collisions fail rather than
silently overwrite. A curated starter thumbnail is local because we own its illustration;
hotlink licensed feed thumbnails instead of committing hundreds of images.

## Advertising and consent

**`js/ads.js` is the only place for portal ad-network code.** Find the large
`PASTE APPROVED AD NETWORK SCRIPT/TAG HERE` comment inside `initializePublisherAds()`.
Paste your real approved publisher integration there and render into the passed visible
`.ad-slot` elements, identified by `data-slot="left|right|mobile"`. Load the SDK once;
remove `.ad-empty` only after receiving a real creative. Follow the network's slot sizes,
refresh rules, and policies. The ad rails have no working network tags or invented revenue. Official publisher games retain their own in-game ads, which are separate from portal rail integration.

The function runs only after explicit “Accept ads”; “Decline” makes no portal ad requests.
The footer's Privacy settings reopens the choice; withdrawing consent reloads to stop
active tags. Browser cookie deletion is separate. Consent is not permission to distribute
a game. **Use the network's certified CMP where required** (e.g. applicable Google
publisher rules); this simple banner is not a legal compliance certification. Update
Privacy and any jurisdiction-specific disclosures before adding a real provider.

Imported external game iframes are gated by the advertising choice and an explicit Play
click because their official publisher SDKs may show ads. Do not remove those SDKs or
break revenue share. A blanket decline cannot technically suppress ads inside an already
loaded cross-origin game: reload or leave the page to unload it. Feed thumbnails still
contact their licensed host while browsing. No portal analytics or rail-ad SDK is shipped. Publisher game embeds include their own SDK and ads; licensed thumbnails load from img.gamemonetize.com while browsing.

## Player, storage, accessibility, and install behavior

Local games get `allow-scripts allow-pointer-lock` (no `allow-same-origin`) for iframe
isolation. External publishers additionally get their own origin and sandboxed popups
when needed; no top-level navigation or sandbox escape is granted. A specific provider
may need a reviewed, domain-specific adjustment to match its official SDK. Do not grant
`allow-same-origin` to arbitrary same-origin code. Some publishers prohibit iframe
embedding with CSP/X-Frame-Options; report and remove incompatible entries, not bypass them.

Counts increment on pressing **Play game**, not on merely viewing the player page.
Stats/favorites are device-local, not cross-device accounts. Storage access is try/catch
protected; if blocked, changes can last only for the current page. No player statistics
are sent by portal JS. GitHub and external providers still receive normal web requests.

Cards are real links (Tab/Enter), heart buttons are independent controls, focus is visible,
`/` focuses search except when typing in another input, and reduced-motion preferences
are respected. The original games support touch or keyboard controls as documented.
2048 is third-party MIT gameplay and retains its upstream interface.

**Install is hidden unless the browser supplies `beforeinstallprompt`.** Browsers that do
not expose this event (notably Safari) can use their native Add to Home Screen UI. HTTPS,
browser engagement/installability rules, and not already being installed affect availability.
A prompt cannot be forced. No custom fake install dialog is shipped.

## SEO and a future custom domain

The homepage and informational pages have titles, descriptions, canonical and Open Graph
metadata. `game.html?id=slug` updates title/description/OG/canonical when JS reads the
catalog. **Non-JavaScript social crawlers will see the generic player metadata**; a static
query-based page cannot provide distinct server-rendered heads without generating separate
game HTML files. The sitemap still includes each playable query URL. Run:

```sh
node scripts/make-sitemap.js
```

For a custom domain:

1. Add the domain in **Settings → Pages → Custom domain** and follow GitHub's current DNS
   verification instructions. Enable HTTPS after provisioning.
2. Add a root **`CNAME`** file containing only the domain (e.g. `games.example.com`), not a URL.
3. Change `BASE_URL` in `scripts/make-sitemap.js`, the player canonical base in `js/game.js`,
   and canonical/OG URLs in the HTML pages. Regenerate `sitemap.xml`. App asset paths and
   the relative manifest/service worker scope already work at a custom-domain root.
4. Update publisher domain registrations, privacy disclosures, and ad-network approvals.

## Verification and maintenance

```sh
# Syntax check (no transpiler/type system needed for vanilla JS)
find js scripts games -name '*.js' -exec node --check {} \;
node --check sw.js
node --test tests/*.test.js
node scripts/make-sitemap.js
```

Tests cover real catalog/schema/permissions artifacts, search/filter/sort composition,
favorites/counts and denied storage, 5,000-entry pagination/timing, feed success/errors,
sitemap output, required files, relative paths, and shell assets. Use a real browser to
verify thumbnail rendering, hover/focus, mobile layout, playability, fullscreen, consent,
install prompt, and offline behavior. A successful HTTP response is not a visual test.

Keep the repo **under 1 GB** and every file **under 100 MB**. This small starter is far below
both. Monitor feed size and remove delisted/disputed entries. Copyright concerns go through
`dmca.html`; Contact links to the actual GitHub issue tracker (enable Issues in repository
settings). Set up a monitored private rights-holder channel before operating at scale;
no invented email address or non-working form is included.

“Unblocked” is not a promise of access on restricted networks. Respect network rules.
No proxy, URL-bypass, panic button, tab disguise, or filter-evasion feature exists here.
