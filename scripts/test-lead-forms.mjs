import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Execute the actual inline form handlers with a fake DOM and fake transport.
// No request leaves the test and no CRM contact is created.
function harness(component, response) {
  const handlers = new Map();
  const button = { disabled: false, textContent: 'Send Message' };
  const form = { style: {}, resets: 0, querySelector: () => button, reset() { this.resets++; }, addEventListener: (name, fn) => handlers.set(name, fn) };
  const success = { style: {} };
  const error = { hidden: true };
  const modal = { style: { display: 'flex' }, addEventListener() {} };
  const events = [];
  const alerts = [];
  const elements = {
    contactForm: form, contactSuccess: success, homeContactError: error,
    valuationForm: form, valuationModal: modal, valuationModalError: error,
  };
  const source = readFileSync(`src/components/${component}.astro`, 'utf8');
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, `inline handler exists for ${component}`);
  runInNewContext(script, {
    document: { getElementById: id => elements[id], body: { style: {} }, dispatchEvent: event => events.push(event) },
    fetch: async () => { if (response === 'network-error') throw new Error('Offline'); return response; },
    FormData: class { get(key) { return { email: 'test@example.invalid', firstName: 'Test', lastName: 'Visitor', name: 'Test Visitor', message: 'Local test', address: 'Test address' }[key] || ''; } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    console: { log() {}, error() {} },
    alert: message => alerts.push(message),
  });
  return { form, button, success, error, modal, events, alerts, submit: () => handlers.get('submit')({ preventDefault() {}, target: form }) };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
for (const component of ['WorkWithUs', 'HomeValuation']) {
  for (const [label, response] of [
    ['HTTP rejection', { ok: false, json: async () => ({ error: 'Rejected' }) }],
    ['unconfirmed 200 response', { ok: true, json: async () => ({ success: false }) }],
    ['malformed response', { ok: true, json: async () => { throw new Error('Invalid JSON'); } }],
    ['network failure', 'network-error'],
  ]) {
    test(`${component}: ${label} preserves the form and allows retry`, async () => {
      const h = harness(component, response); h.submit(); await flush();
      assert.notEqual(h.form.style.display, 'none');
      assert.equal(h.form.resets, 0);
      assert.equal(h.button.disabled, false);
      assert.equal(h.error.hidden, false);
      assert.equal(h.events.length, 0);
      assert.equal(h.alerts.length, 0);
      assert.equal(h.modal.style.display, 'flex');
    });
  }
  test(`${component}: confirmed receipt shows success and emits one conversion`, async () => {
    const h = harness(component, { ok: true, json: async () => ({ success: true }) });
    h.submit(); h.submit(); await flush();
    assert.equal(h.events.length, 1);
    assert.equal(h.events[0].type, 'cpre:lead-submitted');
    assert.deepEqual(Object.keys(h.events[0].detail), ['form']);
    assert.equal(h.error.hidden, true);
    if (component === 'WorkWithUs') assert.equal(h.form.style.display, 'none');
    else { assert.equal(h.modal.style.display, 'none'); assert.equal(h.form.resets, 1); }
  });
}
