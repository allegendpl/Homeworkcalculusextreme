/* All publisher ad integration belongs in THIS FILE ONLY.
 * Never request the network SDK, pixels, or tags before accepted consent.
 * A production network may require its certified CMP (e.g. Google EU rules):
 * replace/extend this simple banner with that CMP before enabling its tags.
 */
(() => {
  'use strict';
  const { el, store, keys, toast } = window.EC;
  let networkLoaded = false, banner;
  const consent = () => new URLSearchParams(location.search).get('ads') === 'off' ? 'declined' : store.read(keys.consent, null);
  async function initializePublisherAds(visibleSlots) {
    /* ===== PASTE APPROVED AD NETWORK SCRIPT/TAG HERE =====
     * Called ONLY after an explicit accepted choice, with visible .ad-slot nodes.
     * Load the network SDK once (this function runs once per page), then render
     * into each visibleSlots element using element.dataset.slot as its placement.
     * Use real publisher IDs and the network's official instructions, including
     * their refresh/size rules; do not load an SDK elsewhere in the HTML.
     * Remove .ad-empty when a REAL creative has been received. Do not add fake ads.
     * Slots: left/right 160x600 (300x600 on very wide screens), mobile 320x100.
     * Consent does not grant any additional game distribution or artwork rights.
     * ================================================== */
    void visibleSlots;
  }
  function loadAds() {
    if (consent() !== 'accepted' || networkLoaded) return;
    const slots = [...document.querySelectorAll('.ad-slot')].filter(slot => slot.getBoundingClientRect().width > 0);
    if (!slots.length) return;
    networkLoaded = true;
    initializePublisherAds(slots).catch(() => toast('Advertisements could not load. Games are still available.'));
  }
  function showBanner() {
    if (banner) { banner.hidden = false; banner.querySelector('button').focus(); return; }
    banner = el('section', 'consent-banner'); banner.setAttribute('aria-label', 'Advertising privacy choices');
    const copy = el('div', 'consent-copy'); copy.append(el('strong', '', 'Your games. Your privacy.'));
    const text = el('p', '', 'Optional advertising may use cookies and third-party requests. Accept to allow portal ad tags, or decline to keep them off. ');
    const link = el('a', '', 'Privacy details'); link.href = 'privacy.html'; text.append(link); copy.append(text);
    const actions = el('div', 'consent-actions');
    for (const [choice, label] of [['declined', 'Decline'], ['accepted', 'Accept ads']]) {
      const button = el('button', choice === 'accepted' ? 'primary' : '', label);
      button.onclick = () => {
        const previous = consent();
        if (choice === 'accepted' && new URLSearchParams(location.search).get('ads') === 'off') { const url = new URL(location.href); url.searchParams.delete('ads'); history.replaceState(null, '', url.href); }
        const saved = store.write(keys.consent, choice); banner.hidden = true;
        document.dispatchEvent(new CustomEvent('ec:consent', { detail: choice }));
        if (choice === 'declined' && previous === 'accepted' && networkLoaded) { if (saved) location.reload(); else { const url = new URL(location.href); url.searchParams.set('ads', 'off'); location.replace(url.href); } return; }
        if (!saved) toast('Choice applies to this visit only: browser storage is unavailable.');
        loadAds();
      }; actions.append(button);
    }
    banner.append(copy, actions); document.body.append(banner);
  }
  document.querySelectorAll('.ad-slot').forEach(slot => { const empty = el('span', 'ad-empty', 'AD SPACE'); empty.setAttribute('aria-hidden', 'true'); slot.append(empty); });
  document.addEventListener('ec:consent-settings', showBanner);
  addEventListener('storage', e => { if (e.key === keys.consent) { if (consent() === 'declined' && networkLoaded) location.reload(); else loadAds(); } });
  if (!['accepted', 'declined'].includes(consent())) showBanner(); else loadAds();
})();
