const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const storageDir = mkdtempSync(path.join(tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_MB = '1';

const app = require('../src/app');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  rmSync(storageDir, { recursive: true, force: true });
});

test('o app backend é exportado', () => {
  assert.equal(typeof app, 'function');
});

test('upload, listagem e download respeitam o proprietário', async (t) => {
  const form = new FormData();
  form.append('file', new Blob(['conteudo do documento']), 'documento.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);

  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'documento.txt');
  assert.equal(document.size, 21);
  assert.equal(document.owner, 'usuario-1');
  assert.ok(document.id);
  assert.doesNotThrow(() => new Date(document.uploadedAt).toISOString());

  await t.test('a listagem filtra documentos por proprietário', async () => {
    const ownResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'usuario-1' },
    });
    assert.equal(ownResponse.status, 200);
    assert.deepEqual((await ownResponse.json()).documents, [document]);

    const otherResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'usuario-2' },
    });
    assert.deepEqual((await otherResponse.json()).documents, []);
  });

  await t.test('o download retorna o arquivo e impede acesso por outro usuário', async () => {
    const downloadUrl = `${baseUrl}/documents/${document.id}/download`;
    const downloadResponse = await fetch(downloadUrl, {
      headers: { 'X-User-Id': 'usuario-1' },
    });
    assert.equal(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get('content-disposition'), /documento\.txt/);
    assert.equal(await downloadResponse.text(), 'conteudo do documento');

    const forbiddenResponse = await fetch(downloadUrl, {
      headers: { 'X-User-Id': 'usuario-2' },
    });
    assert.equal(forbiddenResponse.status, 404);
  });
});

test('as rotas validam identidade, arquivo e identificador', async (t) => {
  await t.test('rejeita upload sem proprietário ou arquivo', async () => {
    const noOwner = await fetch(`${baseUrl}/upload`, { method: 'POST' });
    assert.equal(noOwner.status, 400);

    const form = new FormData();
    const noFile = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-1' },
      body: form,
    });
    assert.equal(noFile.status, 400);
  });

  await t.test('rejeita identificador inválido e documento inexistente', async () => {
    const invalidId = await fetch(`${baseUrl}/documents/invalido/download`, {
      headers: { 'X-User-Id': 'usuario-1' },
    });
    assert.equal(invalidId.status, 400);

    const missingDocument = await fetch(
      `${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`,
      { headers: { 'X-User-Id': 'usuario-1' } },
    );
    assert.equal(missingDocument.status, 404);
  });
});
