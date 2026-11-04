export function initBooking(slot) {
  const doc = slot.ownerDocument;
  const button = slot.querySelector('[data-load-booking]');
  const status = slot.querySelector('[data-booking-status]');
  if (!button || !status) return;
  button.addEventListener('click', () => {
    if (slot.dataset.loaded === 'true') return;
    slot.dataset.loaded = 'true'; button.disabled = true;
    status.hidden = false; status.textContent = 'Loading available times…';
    doc.dispatchEvent(new CustomEvent('cpre:booking-opened'));
    const embed = doc.createElement('div'); embed.className = 'tidycal-embed'; embed.dataset.path = slot.dataset.path;
    slot.appendChild(embed);
    const script = doc.createElement('script'); script.src = 'https://asset-tidycal.b-cdn.net/js/embed.js'; script.async = true;
    script.addEventListener('load', () => { slot.querySelector('[data-booking-facade]').hidden = true; });
    script.addEventListener('error', () => {
      embed.remove(); script.remove(); slot.dataset.loaded = 'false'; button.disabled = false;
      status.textContent = 'The calendar could not load. Try again or open the booking page above.';
    });
    doc.body.appendChild(script);
  });
}
