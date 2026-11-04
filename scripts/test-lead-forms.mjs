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

function contactHarness(response, source = '') {
  let submit;
  const field = value => ({ value, style: {}, classList: { add() {}, remove() {} } });
  const fields = { '#cf-name': field('Test Visitor'), '#cf-email': field('test@example.invalid'), '#cf-message': field('Local test'), '#cf-phone': field('') };
  const button = { disabled: false, textContent: 'Send Message', style: {} };
  const success = { style: { display: 'none' } };
  const error = { style: { display: 'none' } };
  const form = {
    style: {}, addEventListener: (_type, handler) => { submit = handler; },
    querySelector: selector => fields[selector] || button,
    querySelectorAll: selector => selector === '.error' ? [] : [...Object.values(fields), button],
  };
  const events = [];
  const payloads = [];
  const script = readFileSync('src/components/ContactForm.astro', 'utf8').match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  runInNewContext(script, {
    document: { getElementById: id => ({ contactForm: form, contactSuccess: success, contactError: error, cfListingBanner: { dataset: { serverSource: source } } })[id], dispatchEvent: event => events.push(event) },
    window: { location: { search: '' } }, URLSearchParams,
    fetch: async (_url, options) => { payloads.push(JSON.parse(options.body)); return response; },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    console: { error() {} },
  });
  return { form, success, error, button, events, payloads, submit: () => submit({ preventDefault() {} }) };
}

test('neighborhood source survives contact initialization without listing query parameters', async()=>{
  const h=contactHarness({ok:true,json:async()=>({success:true})},'Mayfair Neighborhood Guide');
  h.submit();await flush();
  assert.equal(h.payloads[0].source,'Mayfair Neighborhood Guide');
  assert.equal(h.events[0].detail.form,'contact');
});

function valuationPageHarness(response) {
  let handler;const events=[],payloads=[];
  const fields=Object.fromEntries([['#vf-name','Local Test'],['#vf-address','Local Test Address'],['#vf-email','test@example.invalid'],['#vf-phone','']].map(([key,value])=>[key,{value,classList:{add(){},remove(){}}}]));
  const button={disabled:false,textContent:'Get My Home Value'};
  const form={style:{},querySelector:key=>fields[key]||button,querySelectorAll:()=>[],addEventListener:(_name,cb)=>handler=cb};
  const success={style:{display:'none'}},error={style:{display:'none'}};
  const script=readFileSync('src/pages/home-value.astro','utf8').match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  runInNewContext(script,{document:{getElementById:id=>({valuationForm:form,valuationSuccess:success,valuationError:error})[id],dispatchEvent:event=>events.push(event)},fetch:async(_url,options)=>{payloads.push(JSON.parse(options.body));return response;},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
  return {form,button,success,error,events,payloads,submit:()=>handler({preventDefault(){}})};
}
test('valuation page accepts an optional blank phone and counts only one accepted submission',async()=>{
  const h=valuationPageHarness({ok:true,json:async()=>({success:true})});h.submit();h.submit();await flush();
  assert.equal(h.payloads.length,1);assert.equal(h.payloads[0].phone,'');assert.equal(h.events.length,1);assert.equal(h.events[0].detail.form,'home-valuation');assert.equal(h.success.style.display,'flex');
});
test('valuation page rejected receipt emits no conversion and permits retry',async()=>{
  const h=valuationPageHarness({ok:true,json:async()=>({success:false})});h.submit();await flush();
  assert.equal(h.events.length,0);assert.equal(h.button.disabled,false);assert.notEqual(h.form.style.display,'none');assert.equal(h.error.style.display,'block');
});

test('shared contact form keeps its nested confirmation visible on accepted receipt', async () => {
  const h = contactHarness({ ok: true, json: async () => ({ success: true }) });
  h.submit(); await flush();
  assert.notEqual(h.form.style.display, 'none');
  assert.equal(h.success.style.display, 'flex');
  assert.equal(h.events.length, 1);
});

test('shared contact form rejects an unconfirmed response and permits retry', async () => {
  const h = contactHarness({ ok: true, json: async () => ({ success: false }) });
  h.submit(); await flush();
  assert.notEqual(h.form.style.display, 'none');
  assert.equal(h.success.style.display, 'none');
  assert.equal(h.error.style.display, 'flex');
  assert.equal(h.button.disabled, false);
  assert.equal(h.events.length, 0);
});

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
