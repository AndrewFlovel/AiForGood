import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../constants/api';

export function useApi() {
  const { token, deviceId, logout } = useAuth();

  async function apiFetch(path, options = {}) {
    const { headers: extraHeaders, ...rest } = options;

    // Con FormData NO seteamos Content-Type: fetch agrega el boundary multipart.
    const isFormData = rest.body instanceof FormData;

    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        'X-Device-ID': deviceId,
        ...extraHeaders,
      },
    });

    if (res.status === 401) {
      logout();
      throw new Error('Sesión expirada');
    }

    return res;
  }

  return { apiFetch };
}
