const API_PREFIX = '/api';

async function request(path, owner, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      'X-User-Id': owner,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const error = new Error(payload?.error?.message || 'Não foi possível comunicar com o servidor.');
    error.code = payload?.error?.code;
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function listDocuments(owner, signal) {
  const response = await request('/documents', owner, { signal });
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', owner, {
    method: 'POST',
    body: formData,
  });
  return (await response.json()).document;
}

function getFilename(response, fallback) {
  const disposition = response.headers.get('content-disposition') || '';
  const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename);
    } catch {
      return fallback;
    }
  }

  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export async function downloadDocument(id, owner, fallbackFilename) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, owner);
  return {
    blob: await response.blob(),
    filename: getFilename(response, fallbackFilename),
  };
}