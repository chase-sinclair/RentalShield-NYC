import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

const origin = process.env.RENTALSHIELD_SMOKE_URL ?? 'http://localhost:3006';
const sampleImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=',
  'base64',
);

async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(45_000),
    ...options,
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  return { status: response.status, body: isJson ? await response.json() : await response.text() };
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function upload(files) {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  return request('/api/upload', { method: 'POST', body: form });
}

test('legacy pages, health, and direct sample result render', async () => {
  for (const [path, expected] of [
    ['/analyze', /Someone contacted me/],
    ['/disclaimer', /Important limitations/],
    ['/results/mock-manhattan-demo', /Risk|Scam/i],
  ]) {
    const result = await request(path);
    assert.equal(result.status, 200, path);
    assert.match(result.body, expected);
  }
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
});

test('listing preflight finds metadata, prompts for a missing address, and accepts manual address', async () => {
  const listing = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    const title = request.url === '/listing' ? '18 Lantern Street for Rent' : 'Rental listing';
    response.end(`<title>${title}</title>`);
  });
  await new Promise((resolve) => listing.listen(0, '127.0.0.1', resolve));
  try {
    const fixture = `http://127.0.0.1:${listing.address().port}`;
    const found = await post('/api/analyze/preflight', { listingUrl: `${fixture}/listing` });
    assert.equal(found.status, 200);
    assert.equal(found.body.source, 'metadata');
    assert.match(found.body.candidateAddress, /18 Lantern Street/i);
    const missing = await post('/api/analyze/preflight', { listingUrl: `${fixture}/unaddressed` });
    assert.equal(missing.body.needsManualAddress, true);
    const manual = await post('/api/analyze/preflight', { manualAddress: '18 Lantern Street' });
    assert.equal(manual.body.source, 'manual');
    assert.equal(manual.body.needsManualAddress, false);
  } finally {
    await new Promise((resolve) => listing.close(resolve));
  }
});

test('upload enforces type, size, and count; staged bytes reach analysis and result handling', async () => {
  const image = new File([sampleImage], 'sample-message.png', { type: 'image/png' });
  assert.equal((await upload([])).status, 400);
  assert.equal((await upload([new File(['plain text'], 'sample.txt', { type: 'text/plain' })])).status, 400);
  assert.equal((await upload(Array(6).fill(image))).status, 400);
  const oversize = new File([new Uint8Array(11 * 1024 * 1024)], 'oversize.png', { type: 'image/png' });
  assert.equal((await upload([oversize])).status, 400);

  const staged = await upload([image]);
  assert.equal(staged.status, 200);
  assert.equal(staged.body.files.length, 1);
  assert.equal(staged.body.files[0].name, 'sample-message.png');
  assert.equal((await post('/api/analyze', {})).status, 400);
  const analyzed = await post('/api/analyze', {
    messageText: 'The lease says $2450 a month. I can meet you at the apartment to show it on Monday.',
    screenshotAssets: staged.body.files,
  });
  assert.equal(analyzed.status, 200);
  assert.equal(analyzed.body.ok, true);
  assert.ok(analyzed.body.data.id);
  assert.ok(Number.isFinite(analyzed.body.data.score));
  const ocr = analyzed.body.trace.find(({ toolName }) => toolName === 'ocr_or_multimodal_extraction_tool');
  assert.equal(ocr?.status, 'completed');
  if (!analyzed.body.persistence.persisted) assert.match(ocr.detail, /fallback/i);
  const id = encodeURIComponent(analyzed.body.data.id);
  assert.equal((await request(`/results/${id}`)).status, 200);
  assert.equal((await request(`/api/analyze/${id}`)).status, analyzed.body.persistence.persisted ? 200 : 404);
  assert.equal((await request('/api/analyze/qa-nonexistent-result')).status, 404);
});
