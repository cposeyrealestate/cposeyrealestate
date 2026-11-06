// TidyCal's documented embed completion event:
// https://help.tidycal.com/article/141-embeding-tidycal-on-your-site
// Only the calendar embedded on this campaign page may trigger navigation.
export function initBookingRedirect(slot, target = window) {
  let completed = false;
  target.addEventListener('message', event => {
    const frame = slot.querySelector('iframe');
    if (completed || event.origin !== 'https://tidycal.com' || !frame?.contentWindow || event.source !== frame.contentWindow) return;
    const booking = event.data?.data?.booking;
    if (event.data?.event !== 'bookingComplete' || !booking || !['string', 'number'].includes(typeof booking.id) || !String(booking.id).trim()) return;
    if (String(booking.booking_type_id) !== '1656759') return;
    completed = true;
    target.location.assign('/');
  });
}
