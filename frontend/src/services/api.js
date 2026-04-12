const productionBackendUrl = 'https://ecom-pn0s.onrender.com';
const localBackendUrl = 'http://localhost:5000';

function resolveBackendUrl() {
  // Use VITE_BACKEND_URL if provided in environment
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  // If on localhost, default to local backend
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return localBackendUrl;
  }

  // Fallback to production
  return productionBackendUrl;
}

const backendUrl = resolveBackendUrl();

/**
 * Enhanced API Request utility with robustness and clear logging
 */
export async function apiRequest(path, method = 'GET', token, body) {
  try {
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
    
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      // Log for developer context (visible in browser console)
      console.error(`[API Error] ${method} ${path}:`, response.status, data);
      
      throw new Error(
        data?.error || 
        data?.message || 
        `Server communication failure (${response.status})`
      );
    }

    return data || {};
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('failed to fetch')) {
      throw new Error('Connection failed. The server may be offline.');
    }
    throw err;
  }
}
