import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

const script = readdirSync('dist/assets').find((file) => file.endsWith('.js'));
const bundle = readFileSync(`dist/assets/${script}`, 'utf8');
const errors = [];
const console = new VirtualConsole();
console.on('jsdomError', (error) => errors.push(error.message));
const dom = new JSDOM('<!doctype html><div data-generated-space-root></div>', {
  url: 'https://avkp49.github.io/running-tracker/', runScripts: 'outside-only',
  pretendToBeVisual: true, virtualConsole: console,
});
const { window } = dom;
window.SVGSVGElement.prototype.createSVGRect = () => ({});
window.AbortSignal = AbortSignal;
let runs = [{ id: 2, date: '2026-10-07T07:00:00.000Z', miles: 8 }];
let confirm = true;
const writes = [];
window.fetch = async (_url, options = {}) => {
  if (options.method === 'POST') {
    assert.equal(options.headers['Content-Type'], 'text/plain;charset=utf-8');
    const body = JSON.parse(options.body);
    writes.push(body.action);
    if (confirm) {
      if (body.action === 'add') runs.push({ id: runs.length + 2, date: body.date, miles: body.miles });
      if (body.action === 'update') runs = runs.map((run) => run.id === body.id ? { ...run, date: body.date, miles: body.miles } : run);
      if (body.action === 'delete') runs = runs.filter((run) => run.id !== body.id);
    }
    return { ok: true, json: async () => ({ ok: confirm }) };
  }
  return { ok: true, json: async () => structuredClone(runs) };
};
const doc = window.document;
const waitFor = async (check, description) => {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out: ${description}. Text: ${doc.body.textContent.slice(-1000)}`);
};
const setInput = (label, value) => {
  const input = doc.querySelector(`input[aria-label="${label}"]`);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
};
const button = (text) => [...doc.querySelectorAll('button')].find((node) => node.textContent.trim() === text);
try {
  window.eval(bundle);
  await waitFor(() => doc.querySelector('.odometer-number')?.textContent === '8', 'initial Google Sheets read');
  assert.match(doc.querySelector('.history-zone').textContent, /Oct 7, 2026/);
  setInput('Run date', '2026-10-08');
  setInput('Miles run', '3');
  button('Launch run').click();
  await waitFor(() => doc.querySelector('.odometer-number')?.textContent === '11', 'confirmed add');
  await waitFor(() => doc.querySelector('#checkpoint-title'), '10-mile celebration');
  assert.match(doc.querySelector('#checkpoint-title').textContent, /10 miles/);
  button('Keep adventuring').click();
  doc.querySelector('button[aria-label^="Edit 3 mile run"]').click();
  setInput('Miles run', '4');
  button('Save changes').click();
  await waitFor(() => doc.querySelector('.odometer-number')?.textContent === '12', 'confirmed edit');
  doc.querySelector('button[aria-label^="Delete 4 mile run"]').click();
  await waitFor(() => button('Delete run'), 'delete confirmation');
  button('Delete run').click();
  await waitFor(() => doc.querySelector('.odometer-number')?.textContent === '8', 'confirmed delete');
  confirm = false;
  setInput('Miles run', '7');
  button('Launch run').click();
  await waitFor(() => doc.querySelector('.form-message')?.textContent.includes('did not confirm'), 'unconfirmed save error');
  assert.equal(doc.querySelector('input[aria-label="Miles run"]').value, '7');
  assert.equal(doc.querySelector('.odometer-number').textContent, '8');
  assert.deepEqual(writes, ['add', 'update', 'delete', 'add']);
  assert.equal(window.localStorage.length, 0);
  assert.deepEqual(errors, []);
  process.stdout.write('PASS: production app renders; Sheets dates, add/edit/delete, 10-mile celebration, unconfirmed-save handling, and no local run storage.\n');
} finally { dom.window.close(); }
