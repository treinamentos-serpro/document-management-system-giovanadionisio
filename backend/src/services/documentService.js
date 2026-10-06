const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

async function createDocument(file, owner) {
  if (file.size === 0) {
    await fs.unlink(file.path).catch(() => {});
    const error = new Error('O arquivo não pode estar vazio.');
    error.code = 'EMPTY_FILE';
    throw error;
  }

  const originalName = path.basename(path.win32.basename(file.originalname)) || 'document';
  const document = {
    id: randomUUID(),
    originalName,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
    storagePath: file.path,
  };

  try {
    documentRepository.create(document);
  } catch (error) {
    await fs.unlink(file.path).catch(() => {});
    throw error;
  }

  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

function findDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }

  return {
    path: document.storagePath,
    originalName: document.originalName,
  };
}

module.exports = { createDocument, findDownload, listDocuments };