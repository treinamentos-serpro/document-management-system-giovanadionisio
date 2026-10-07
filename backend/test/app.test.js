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
    assert.deepEqual(await forbiddenResponse.json(), {
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
    });
  });
});

test('as rotas validam identidade, arquivo e identificador', async (t) => {
  await t.test('rejeita upload sem proprietário ou arquivo', async () => {
    const noOwner = await fetch(`${baseUrl}/upload`, { method: 'POST' });
    assert.equal(noOwner.status, 400);
    assert.deepEqual(await noOwner.json(), {
      error: { code: 'OWNER_REQUIRED', message: 'O cabeçalho X-User-Id é obrigatório.' },
    });

    const form = new FormData();
    const noFile = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'usuario-1' },
      body: form,
    });
    assert.equal(noFile.status, 400);
    assert.deepEqual(await noFile.json(), {
      error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' },
    });
  });

  await t.test('rejeita identificador inválido e documento inexistente', async () => {
    const invalidId = await fetch(`${baseUrl}/documents/invalido/download`, {
      headers: { 'X-User-Id': 'usuario-1' },
    });
    assert.equal(invalidId.status, 400);
    assert.deepEqual(await invalidId.json(), {
      error: { code: 'INVALID_DOCUMENT_ID', message: 'O identificador do documento é inválido.' },
    });

    const missingDocument = await fetch(
      `${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`,
      { headers: { 'X-User-Id': 'usuario-1' } },
    );
    assert.equal(missingDocument.status, 404);
    assert.deepEqual(await missingDocument.json(), {
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
    });
  });
});

test('listagem e download exigem identidade', async (t) => {
  for (const endpoint of [
    '/documents',
    '/documents/00000000-0000-4000-8000-000000000000/download',
  ]) {
    await t.test(endpoint, async () => {
      const response = await fetch(`${baseUrl}${endpoint}`);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: { code: 'OWNER_REQUIRED', message: 'O cabeçalho X-User-Id é obrigatório.' },
      });
    });
  }
});

test('uploads inválidos não aparecem na listagem', async (t) => {
  const owner = 'usuario-upload-invalido';
  const cases = [
    {
      name: 'rejeita arquivo vazio',
      field: 'file',
      content: '',
      status: 400,
      code: 'EMPTY_FILE',
    },
    {
      name: 'rejeita arquivo acima do limite configurado',
      field: 'file',
      content: Buffer.alloc(1024 * 1024 + 1),
      status: 413,
      code: 'FILE_TOO_LARGE',
    },
    {
      name: 'rejeita arquivo enviado em campo incorreto',
      field: 'document',
      content: 'conteudo',
      status: 400,
      code: 'INVALID_FILE_FIELD',
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const form = new FormData();
      form.append(scenario.field, new Blob([scenario.content]), 'documento.txt');

      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { 'X-User-Id': owner },
        body: form,
      });
      assert.equal(response.status, scenario.status);
      const { error } = await response.json();
      assert.equal(error.code, scenario.code);
      assert.equal(typeof error.message, 'string');
      assert.ok(error.message.length > 0);

      const listResponse = await fetch(`${baseUrl}/documents`, {
        headers: { 'X-User-Id': owner },
      });
      assert.equal(listResponse.status, 200);
      assert.deepEqual(await listResponse.json(), { documents: [] });
    });
  }
});
