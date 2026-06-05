import React, { useEffect, useState } from 'react';
import { Store, X, CheckCircle2 } from 'lucide-react';
import { useRegistroStore } from '../store/useRegistroStore';
import type { CategoriaCliente, PDVCreatePayload } from '../types/api';

const CATEGORIA_STYLES: Record<CategoriaCliente, string> = {
  MAYORISTA: 'bg-indigo-100 text-indigo-800',
  MINORISTA: 'bg-cyan-100 text-cyan-800',
  DETALLISTA: 'bg-amber-100 text-amber-800',
};

const DIAS = [
  { key: 'visit_mon', label: 'L' },
  { key: 'visit_tue', label: 'M' },
  { key: 'visit_wed', label: 'X' },
  { key: 'visit_thu', label: 'J' },
  { key: 'visit_fri', label: 'V' },
  { key: 'visit_sat', label: 'S' },
] as const;

const emptyForm: PDVCreatePayload = {
  code: '',
  client_code: '',
  market: '',
  client_type: '',
  latitud: -17.7833,
  longitud: -63.1821,
  visit_minutes_estimated: 20,
  visit_mon: false,
  visit_tue: false,
  visit_wed: false,
  visit_thu: false,
  visit_fri: false,
  visit_sat: false,
  notes: '',
};

export const TabLocalesPDV: React.FC = () => {
  const {
    pdvs,
    loadingPdvs,
    errorPdvs,
    fetchPdvs,
    crearPdv,
    markets,
    clientTypes,
    fetchCatalogos,
  } = useRegistroStore();

  const [filtro, setFiltro] = useState<CategoriaCliente | 'TODOS'>('TODOS');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PDVCreatePayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetchPdvs();
    fetchCatalogos();
  }, [fetchPdvs, fetchCatalogos]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await crearPdv(form);
      setForm(emptyForm);
      setShowForm(false);
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear local');
    } finally {
      setSaving(false);
    }
  };

  const visibles = pdvs.filter((p) => filtro === 'TODOS' || p.categoria === filtro);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['TODOS', 'MAYORISTA', 'MINORISTA', 'DETALLISTA'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFiltro(c)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filtro === c ? 'bg-white text-venaris-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c === 'TODOS' ? 'Todos' : c.charAt(0) + c.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-venaris-primary hover:bg-venaris-primary-light text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo Local'}
        </button>
      </div>

      {ok && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4" /> Local registrado correctamente.
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
            <input
              type="text"
              required
              maxLength={10}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary outline-none"
              placeholder="SC005"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
            <input
              type="text"
              required
              maxLength={20}
              value={form.client_code}
              onChange={(e) => setForm({ ...form, client_code: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary outline-none"
              placeholder="SC-MIN-003"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría *</label>
            <select
              required
              value={form.client_type}
              onChange={(e) => setForm({ ...form, client_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-venaris-primary outline-none"
            >
              <option value="">Seleccionar...</option>
              {clientTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mercado *</label>
            <select
              required
              value={form.market}
              onChange={(e) => setForm({ ...form, market: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-venaris-primary outline-none"
            >
              <option value="">Seleccionar...</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.city ? `(${m.city})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Latitud *</label>
            <input
              type="number"
              step="any"
              required
              value={form.latitud}
              onChange={(e) => setForm({ ...form, latitud: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Longitud *</label>
            <input
              type="number"
              step="any"
              required
              value={form.longitud}
              onChange={(e) => setForm({ ...form, longitud: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Minutos por visita</label>
            <input
              type="number"
              min={1}
              value={form.visit_minutes_estimated}
              onChange={(e) =>
                setForm({ ...form, visit_minutes_estimated: parseInt(e.target.value || '0', 10) })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Días de visita</label>
            <div className="flex gap-1.5">
              {DIAS.map(({ key, label }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setForm({ ...form, [key]: !form[key] })}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                    form[key]
                      ? 'bg-venaris-primary text-white'
                      : 'bg-white border border-gray-300 text-gray-500 hover:border-venaris-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {formError && <p className="md:col-span-3 text-sm text-venaris-tertiary">{formError}</p>}
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-venaris-secondary hover:opacity-90 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-opacity disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Crear Local'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loadingPdvs && <p className="p-6 text-sm text-gray-400">Cargando...</p>}
        {errorPdvs && <p className="p-6 text-sm text-venaris-tertiary">{errorPdvs}</p>}
        {!loadingPdvs && !errorPdvs && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-venaris-primary text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Mercado</th>
                  <th className="px-4 py-3 text-center">Categoría</th>
                  <th className="px-4 py-3">Coordenadas</th>
                  <th className="px-4 py-3 text-center">Min.</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{p.code}</td>
                    <td className="px-4 py-3 text-gray-600">{p.client_code}</td>
                    <td className="px-4 py-3 text-gray-600">{p.market_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          CATEGORIA_STYLES[p.categoria] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {p.visit_minutes_estimated}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                      No hay locales en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
