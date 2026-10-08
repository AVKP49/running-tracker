import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasMapDetail } from '../client/src/tile-health.ts';

// RGBA samples extracted from actual provider images, including the exact
// API-key placard the owner saw. This tests pixel content, not HTTP status.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/tile-samples.json', import.meta.url), 'utf8'));
for (const sample of fixtures) {
  assert.equal(hasMapDetail(Buffer.from(sample.rgba, 'base64')), sample.expected, sample.name);
}
process.stdout.write('PASS: real OSM and OSM France tiles accepted; API-key and access-blocked images rejected.\n');
