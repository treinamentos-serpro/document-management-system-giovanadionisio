import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

const DEFAULT_USER_ID = 'usuario-1';

function getSavedUserId() {
  return window.localStorage.getItem('dms-user-id') || DEFAULT_USER_ID;
}

export default function App() {
  const [userDraft, setUserDraft] = useState(getSavedUserId);
  const [userId, setUserId] = useState(getSavedUserId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    window.localStorage.setItem('dms-user-id', userId);
  }, [userId]);

  useEffect(() => {
    const abortController = new AbortController();
    setIsLoading(true);

    listDocuments(userId, abortController.signal)
      .then(setDocuments)
      .catch((error) => {
        if (!abortController.signal.aborted) {
          setDocuments([]);
          setNotice({ type: 'error', message: error.message });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [userId, refreshVersion]);

  function handleUserSubmit(event) {
    event.preventDefault();
    const nextUserId = userDraft.trim();
    if (!nextUserId) {
      setNotice({ type: 'error', message: 'Informe um identificador de usuário.' });
      return;
    }

    setNotice(null);
    setUserId(nextUserId);
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setNotice(null);

    try {
      await uploadDocument(file, userId);
      setNotice({ type: 'success', message: 'Documento enviado com sucesso.' });
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  function handleDownloadError(error) {
    setNotice({ type: 'error', message: error.message });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">Documentos</span>
        </a>
        <form className="identity-form" onSubmit={handleUserSubmit}>
          <label htmlFor="user-id">Usuário</label>
          <input
            id="user-id"
            value={userDraft}
            onChange={(event) => setUserDraft(event.target.value)}
            autoComplete="off"
            maxLength={80}
          />
          <button type="submit" className="identity-submit">Abrir</button>
        </form>
      </header>

      <div className="workspace" id="main">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ARQUIVO PESSOAL</p>
            <h1 id="page-title">Seus documentos</h1>
            <p className="page-description">Envie, organize e acesse seus arquivos.</p>
          </div>
          <div className="document-count" aria-live="polite">
            <span className="count-number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="count-label">{documents.length === 1 ? 'documento' : 'documentos'}</span>
          </div>
        </section>

        {notice && (
          <div className={`notice notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button>
          </div>
        )}

        <UploadComponent isUploading={isUploading} onUpload={handleUpload} />

        <section className="documents-section" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BIBLIOTECA</p>
              <h2 id="documents-title">Arquivos recentes</h2>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              disabled={isLoading}
              aria-label="Atualizar lista de documentos"
              title="Atualizar lista"
            >
              ↻
            </button>
          </div>
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            owner={userId}
            onDownloadError={handleDownloadError}
          />
        </section>

        <footer className="app-footer">
          <span>Armazenamento local</span>
          <span className="footer-status"><i aria-hidden="true" /> Sistema disponível</span>
        </footer>
      </div>
    </main>
  );
}