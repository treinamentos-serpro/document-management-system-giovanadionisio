const express = require('express');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(documentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o tamanho permitido.' },
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: { code: 'INVALID_FILE_FIELD', message: 'Envie um arquivo no campo "file".' },
    });
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Não foi possível concluir a operação.' },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
