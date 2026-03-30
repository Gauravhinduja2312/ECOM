const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

export async function apiRequest(path, method = 'GET', token, body) {
  const response = await fetch(`${backendUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const responseText = await response.text();

  let data = null;
  if (isJson && responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error
      || data?.message
      || `API request failed (${response.status})`
    );
  }

  if (!isJson) {
    throw new Error(`Unexpected API response format (${response.status})`);
  }

  return data || {};
}
