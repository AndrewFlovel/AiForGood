import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, User } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, device_id: 'web-supervisor-01' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Credenciales incorrectas');
        return;
      }

      // Validación de Seguridad Front-end: Solo Supervisores o Administradores
      if (!data.is_staff && !data.is_superuser && data.role !== 'Supervisor') {
        setError('Acceso denegado. Esta cuenta no tiene privilegios de Supervisor o Administrador.');
        return;
      }

      // Guardamos tokens usando nuestro nuevo store
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      login(data.access, username);
      
      // Redirigimos al Dashboard
      navigate('/logistica/dashboard', { replace: true });

    } catch (err) {
      setError('No se pudo conectar al servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center mb-6 gap-3">
          <img src="/logo.svg" alt="Industrias Venaris" className="w-24 h-24 object-contain" />
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold tracking-[0.32em] text-venaris-primary uppercase">
              Industrias
            </span>
            <span className="text-3xl font-extrabold text-venaris-primary leading-tight">
              VENARIS
            </span>
          </div>
        </div>
        <h2 className="text-center text-lg font-bold tracking-widest text-venaris-primary uppercase mb-1">
          Venaris Route AI — Logística Pro
        </h2>
        <p className="text-center text-sm text-gray-500">
          Panel de control para supervisores
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-[#D32F2F] p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-[#D32F2F]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Usuario</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-venaris-primary focus:border-venaris-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 bg-gray-50 border transition-colors outline-none"
                  placeholder="Ej. admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-venaris-primary focus:border-venaris-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 bg-gray-50 border transition-colors outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-venaris-primary hover:bg-venaris-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-venaris-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
