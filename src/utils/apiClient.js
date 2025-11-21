const API_BASE_URL = process.env.REACT_APP_PAYMENTS_API_BASE_URL;

async function request(endpoint, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('Missing REACT_APP_PAYMENTS_API_BASE_URL. Please set it in your .env file.');
  }
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[API] Request', {
    url,
    method: options.method || 'GET'
  });
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  console.log('[API] Response', { url, status: response.status, ok: response.ok, body: data });
  if (!response.ok) {
    const message = data?.error || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return data;
}

export async function post(endpoint, body, { token } = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return request(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

