import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : dateFormatter.format(date);
}

export default function DocumentList({ documents, isLoading, owner, onDownloadError }) {
  if (isLoading) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-symbol" aria-hidden="true">▤</span>
        <h3>Nenhum documento por aqui</h3>
        <p>Os arquivos enviados aparecerão nesta lista.</p>
      </div>
    );
  }

  return (
    <div className="document-table-wrap">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Adicionado em</th>
            <th scope="col">Tamanho</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <div className="document-name-cell">
                  <span className="document-file-icon" aria-hidden="true">DOC</span>
                  <span className="document-name" title={document.originalName}>{document.originalName}</span>
                </div>
              </td>
              <td className="document-date">{formatDate(document.uploadedAt)}</td>
              <td className="document-size">{formatFileSize(document.size)}</td>
              <td className="document-action">
                <DownloadButton
                  document={document}
                  owner={owner}
                  onError={onDownloadError}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}