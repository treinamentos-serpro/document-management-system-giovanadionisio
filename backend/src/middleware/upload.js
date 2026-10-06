const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '..', '..', 'storage');

const configuredSizeLimit = Number(process.env.MAX_FILE_SIZE_MB);
const maxFileSizeMb = Number.isFinite(configuredSizeLimit) && configuredSizeLimit > 0
  ? configuredSizeLimit
  : 10;

fs.mkdirSync(storageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, storageDirectory),
  filename: (req, file, callback) => callback(null, randomUUID()),
});

module.exports = multer({
  storage,
  limits: {
    files: 1,
    fileSize: maxFileSizeMb * 1024 * 1024,
  },
});