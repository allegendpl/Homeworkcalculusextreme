# Catalog source and permission record

Reviewed on October 9, 2026. The collection has 204 unique entries: five local MIT
starters and 199 official GameMonetize publisher embeds. We do not assert that the
publisher games are open-source or that we own their artwork.

## Official publisher evidence

- https://gamemonetize.com/faq — the “Revenue share” section states:
  **“You can embed games on your site, register on our portal, add your site in the
  dashboard and get revenue share from games published to your website.”**
- https://gamemonetize.com/rss-builder — the provider's official feed builder tells
  publishers to select their requirements, generate JSON/RSS, and add games to their
  portals. It provides title, description, instructions, thumbnail and hosted-game URLs.
- https://gamemonetize.com/publishers — publisher program and revenue-share details.
- https://gamemonetize.com/privacypolicy — provider privacy disclosures.

The feed builder's `gamemonetize.com/rssfeed.php` endpoint redirects to
`https://rss.gamemonetize.com/rssfeed.php`. The public adapter uses the final official
endpoint directly, with the exact field names observed in its JSON, no guessed API key:

```
format=json&category=All&type=html5&popularity=newest&company=QkyGames&amount=100
format=json&category=All&type=html5&popularity=newest&company=InlogicSoftwares.r.o.&amount=100
format=json&category=All&type=html5&popularity=newest&company=Playtouch&amount=100
```

The company values and amount options come from the official builder. Feed responses
currently contain up to 101 entries for amount=100. The adapter does not assume exactly
100 rows and only imports the reviewed allowlist, never the entire result indiscriminately.

## Selection and credits

`feed-selection.json` records provider IDs, studio-filter values, credited studio names,
pinned title/embed/thumbnail URLs, review date, and a 200-total minimum for refreshes.
Only entries in this file are eligible. Source fields credit both GameMonetize and the
studio whose official company-filtered feed supplied the listing. License fields identify
publisher embedding permission and link the FAQ, rather than invent an MIT license.

Descriptions and controls come from the official feed, with entity decoding/markup
removal. Category names are normalized for the portal. The complete official hosted
embed URL is preserved. Thumbnails are hotlinked from `img.gamemonetize.com`; game
files are NOT copied. The upstream games retain their SDKs, branding, and advertisements.
No modifications to publisher game content were made.

Titles, prose and contact-sheet artwork were screened for obvious commercial-franchise
lookalikes, branded-logo content, gambling titles and duplicate-looking releases. This is
curation under the provider's explicit distribution invitation, **not** a legal guarantee
about every downstream asset. Provider distribution permission is not a substitute for
investigating a credible rights-holder complaint. Remove disputed entries and contact
the provider, following `dmca.html`. Do not add entries just because their URL works.

## Delivery checks (not browser gameplay certification)

All 199 included thumbnails returned HTTP 200 with actual decodable image data. Every
included embed returned HTML, with no X-Frame-Options or response-header CSP restriction
observed. Thumbnails were reviewed as temporary contact sheets; those downloaded copies
are not part of the deployed catalog. The local portal is tested at the Pages subpath,
and its event harness covers consent-gated external player loading.

HTTP/decoded-image checks do not establish rendering, gameplay, load time, popup behavior,
ad suitability, or compatibility on a school Chromebook. These require real browser
review. Games may be delisted, unavailable in some regions, or blocked by a network.

## Operator setup

Embedding invitation and public feed access do not establish a publisher revenue-share
account. Register the deployed domain with GameMonetize and follow its current program,
SDK/ad and privacy requirements if you want payouts. Do not remove or intercept publisher
ads, modify their SDK, impersonate an official game site, or bypass embedding restrictions.

External images contact their host while browsing. External games require explicit Play
and advertising consent in this portal; their own SDKs may show further consent dialogs.
Keep the provider disclosures in `privacy.html` current. A simple portal banner is not a
certified CMP or a claim of legal compliance for all jurisdictions.

The original five MIT entries retain author copyright/license notices in `games/`.
See `games/2048/provenance.md`, `games/2048/LICENSE.txt`, `games/original/LICENSE.txt`, and
`thumbnails/LICENSE.txt` for their separately auditable local provenance.
