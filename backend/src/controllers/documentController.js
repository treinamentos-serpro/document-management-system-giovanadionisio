const documentService = require('../services/documentService');

function requireOwner(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return res.status(400).json({
      error: { code: 'OWNER_REQUIRED', message: 'O cabeçalho X-User-Id é obrigatório.' },
    });
  }

  req.owner = owner;
  return next();
}

async function upload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' },
    });
  }

  try {
    const document = await documentService.createDocument(req.file, req.owner);
    return res.status(201).json({ document });
  } catch (error) {
    if (error.code === 'EMPTY_FILE') {
      return res.status(400).json({
        error: { code: error.code, message: error.message },
      });
    }

    return next(error);
  }
}

function list(req, res) {
  return res.status(200).json({
    documents: documentService.listDocuments(req.owner),
  });
}

function download(req, res) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
    return res.status(400).json({
      error: { code: 'INVALID_DOCUMENT_ID', message: 'O identificador do documento é inválido.' },
    });
  }

  const file = documentService.findDownload(req.params.id, req.owner);
  if (!file) {
    return res.status(404).json({
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
    });
  }

  return res.download(file.path, file.originalName, (error) => {
    if (error && !res.headersSent) {
      res.status(500).json({
        error: { code: 'DOWNLOAD_FAILED', message: 'Não foi possível baixar o documento.' },
      });
    }
  });
}

module.exports = { download, list, requireOwner, upload };