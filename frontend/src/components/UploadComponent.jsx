import { useRef, useState } from 'react';
import { formatFileSize } from '../utils/formatFileSize.js';

export default function UploadComponent({ isUploading, onUpload }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    setError('');
    try {
      await onUpload(file);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch {
      // O app apresenta a mensagem retornada pela API.
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div className="upload-copy">
        <span className="upload-symbol" aria-hidden="true">↑</span>
        <div>
          <h2 id="upload-title">Adicionar documento</h2>
          <p>Escolha um arquivo para armazenar com segurança.</p>
        </div>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className={`file-picker${file ? ' has-file' : ''}`} htmlFor="document-file">
          <span className="file-picker-name">{file ? file.name : 'Selecionar arquivo'}</span>
          <span className="file-picker-action">Procurar</span>
        </label>
        <input
          ref={inputRef}
          id="document-file"
          type="file"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError('');
          }}
        />
        <button className="upload-button" type="submit" disabled={isUploading || !file}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
      </form>
      <div className="upload-meta" aria-live="polite">
        {error ? <span className="inline-error">{error}</span> : (
          <span>{file ? `${formatFileSize(file.size)} selecionados` : 'Tamanho máximo: 10 MB'}</span>
        )}
        <span>Arquivos armazenados localmente</span>
      </div>
    </section>
  );
}