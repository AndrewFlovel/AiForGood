import React, { useEffect } from 'react';
import { MapaCalor } from '../components/MapaCalor';
import { PanelSpaceShare } from '../components/PanelSpaceShare';
import { PanelCorrelacion } from '../components/PanelCorrelacion';
import { TablaDecisiones } from '../components/TablaDecisiones';
import { StatusBadge } from '../components/StatusBadge';
import { useDashboardStore, useSupervisorStore } from '../store/useDashboardStore';

const DashboardPage: React.FC = () => {
  const { sucursalSeleccionada } = useDashboardStore();
  const { supervisorData, supervisorLoading, supervisorError, fetchSupervisorDashboard } =
    useSupervisorStore();

  useEffect(() => {
    fetchSupervisorDashboard();
  }, [fetchSupervisorDashboard]);

  return (
    <div className="pb-8 space-y-8">

      {/* ── Sección: Panel Supervisor (API real) ─────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-venaris-primary">Panel Supervisor</h2>
          <p className="text-gray-500 text-sm">Estado de rutas del día — tiempo real.</p>
        </div>

        {supervisorLoading && (
          <div className="flex items-center gap-3 text-gray-400 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-venaris-primary" />
            <span className="text-sm">Cargando datos del backend...</span>
          </div>
        )}

        {supervisorError && !supervisorLoading && (
          <div className="bg-red-50 border-l-4 border-venaris-tertiary p-4 rounded-lg">
            <p className="text-sm text-red-700">{supervisorError}</p>
          </div>
        )}

        {supervisorData && !supervisorLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b text-xs text-gray-500 font-medium">
              Fecha: {supervisorData.fecha}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-venaris-primary text-white text-xs uppercase tracking-wide">
                    <th className="px-4 py-3">Reponedor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-center">PDVs</th>
                    <th className="px-4 py-3 text-center">Completados</th>
                    <th className="px-4 py-3 text-center">Pendientes</th>
                    <th className="px-4 py-3 text-center">Omitidos</th>
                    <th className="px-4 py-3 text-center">% Avance</th>
                    <th className="px-4 py-3 text-center">Min Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisorData.rutas.map((r, i) => (
                    <tr
                      key={r.route_id ?? i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.reponedor ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.total_pdvs}</td>
                      <td className="px-4 py-3 text-center font-bold text-venaris-secondary">
                        {r.completados ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {r.pendientes ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-venaris-tertiary">
                        {r.omitidos ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {r.pct_completitud ?? 0}%
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {r.total_estimado_min ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {supervisorData.rutas.length === 0 && (
                <p className="text-center py-10 text-gray-400 text-sm">
                  Sin rutas activas para hoy.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Sección: Dashboard Analítico (mocks existentes) ──────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-venaris-primary">Dashboard Analítico</h2>
          <p className="text-gray-500 text-sm">
            Mapeo de calor, ejecución en punto de venta y correlación operativa.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[500px]">
          <div className="flex-[2] h-full rounded-xl overflow-hidden shadow-sm relative z-0">
            <MapaCalor />
          </div>
          <div className="flex-1 h-full flex flex-col gap-4">
            {sucursalSeleccionada ? <PanelCorrelacion /> : <PanelSpaceShare />}
          </div>
        </div>

        <TablaDecisiones />
      </section>

    </div>
  );
};

export default DashboardPage;
