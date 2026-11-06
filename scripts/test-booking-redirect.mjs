import test from 'node:test';
import assert from 'node:assert/strict';
import { initBookingRedirect } from '../src/lib/booking-redirect.mjs';

function setup() {
  let listener; const redirects = []; const frameWindow = {};
  let frame = null;
  initBookingRedirect({ querySelector: () => frame }, {
    addEventListener: (name, fn) => { assert.equal(name, 'message'); listener = fn; },
    location: { assign: value => redirects.push(value) },
  });
  const event = { origin: 'https://tidycal.com', source: frameWindow, data: { event: 'bookingComplete', data: { booking: { id: 123, booking_type_id: 1656759 } } } };
  return { redirects, event, send: e => listener(e), load: () => { frame = { contentWindow: frameWindow }; } };
}

test('only a confirmed booking from the loaded relocation calendar redirects home, once', () => {
  const s = setup(); s.send(s.event); assert.deepEqual(s.redirects, []);
  s.load(); s.send(s.event); s.send(s.event); assert.deepEqual(s.redirects, ['/']);
});

test('unrelated windows, origins, resize events, and incomplete or different bookings cannot redirect', () => {
  const s = setup(); s.load();
  for (const e of [
    { ...s.event, origin: 'https://tidycal.com.example.com' },
    { ...s.event, source: {} },
    { ...s.event, data: null },
    { ...s.event, data: { event: 'resize', data: s.event.data.data } },
    { ...s.event, data: { event: 'bookingComplete', data: { booking: {} } } },
    { ...s.event, data: { event: 'bookingComplete', data: { booking: { id: 123, booking_type_id: 999 } } } },
  ]) s.send(e);
  assert.deepEqual(s.redirects, []);
});
