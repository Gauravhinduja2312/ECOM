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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}
