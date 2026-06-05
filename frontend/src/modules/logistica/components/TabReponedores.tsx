import React, { useEffect, useState } from 'react';
import { UserPlus, MapPin, X, CheckCircle2 } from 'lucide-react';
import { useRegistroStore } from '../store/useRegistroStore';

export const TabReponedores: React.FC = () => {
  const {
    reponedores,
    loadingReponedores,
    errorReponedores,
    fetchReponedores,
    crearReponedor,
  } = useRegistroStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', username: '', password: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetchReponedores();
  }, [fetchReponedores]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await crearReponedor(form);
      setForm({ nombre: '', username: '', password: '', is_active: true });
      setShowForm(false);
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reponedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {reponedores.length} reponedor{reponedores.length !== 1 && 'es'} registrado
          {reponedores.length !== 1 && 's'}.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-venaris-primary hover:bg-venaris-primary-light text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo Reponedor'}
        </button>
      </div>

      {ok && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4" /> Reponedor creado correctamente.
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary focus:border-venaris-primary outline-none"
              placeholder="Ej. Carlos Montaño"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario *</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary focus:border-venaris-primary outline-none"
              placeholder="Ej. reponedor_sc"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña *</label>
            <input
              type="text"
              required
              minLength={4}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary focus:border-venaris-primary outline-none"
              placeholder="Mínimo 4 caracteres"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-venaris-primary"
              />
              Activo
            </label>
          </div>
          {formError && (
            <p className="md:col-span-2 text-sm text-venaris-tertiary">{formError}</p>
          )}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-venaris-secondary hover:opacity-90 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-opacity disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Crear Reponedor'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loadingReponedores && <p className="p-6 text-sm text-gray-400">Cargando...</p>}
        {errorReponedores && (
          <p className="p-6 text-sm text-venaris-tertiary">{errorReponedores}</p>
        )}
        {!loadingReponedores && !errorReponedores && (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-venaris-primary text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">PDVs hoy</th>
                <th className="px-4 py-3">Última ubicación</th>
              </tr>
            </thead>
            <tbody>
              {reponedores.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.nombre_completo}</td>
                  <td className="px-4 py-3 text-gray-600">{r.username}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {r.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-venaris-primary">
                    {r.pdvs_hoy}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.ultima_ubicacion ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-venaris-secondary" />
                        {r.ultima_ubicacion.lat.toFixed(4)}, {r.ultima_ubicacion.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin reporte</span>
                    )}
                  </td>
                </tr>
              ))}
              {reponedores.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                    No hay reponedores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
