import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Briefcase, UserPlus } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState('Supervisor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          first_name: firstName,
          role 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Formatear errores del serializador de DRF
        const errorMsg = Object.values(data).flat().join(', ') || 'Error al registrar usuario';
        setError(errorMsg);
        return;
      }

      // Registro exitoso, redirigimos al login
      navigate('/auth/login', { replace: true });

    } catch (err) {
      setError(`No se pudo conectar al servidor. Verifica que Django esté corriendo en ${BACKEND_URL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#003366] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          CREAR CUENTA
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Regístrate en la Plataforma Logística
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
              <label className="block text-sm font-medium text-gray-700">Nombre de Usuario</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-[#003366] focus:border-[#003366] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 bg-gray-50 border transition-colors outline-none"
                  placeholder="Ej. m.perez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="focus:ring-[#003366] focus:border-[#003366] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 bg-gray-50 border transition-colors outline-none"
                  placeholder="Ej. Mario Perez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="focus:ring-[#003366] focus:border-[#003366] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 bg-gray-50 border transition-colors outline-none"
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Reponedor">Reponedor</option>
                </select>
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
                  className="focus:ring-[#003366] focus:border-[#003366] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 bg-gray-50 border transition-colors outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#003366] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003366] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'REGISTRANDO...' : 'REGISTRARSE'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <Link to="/auth/login" className="text-sm font-medium text-[#003366] hover:text-blue-800 transition-colors">
                ¿Ya tienes una cuenta? Inicia sesión aquí
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
