import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardStore } from '../store/useDashboardStore';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

export const PanelCorrelacion: React.FC = () => {
  const { sucursalSeleccionada, setSucursalSeleccionada } = useDashboardStore();

  if (!sucursalSeleccionada) return null;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-blue-200 p-5 relative animate-in slide-in-from-right-4 duration-300 overflow-y-auto">
      <button 
        onClick={() => setSucursalSeleccionada(null)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-sm font-medium"
      >
        Cerrar
      </button>

      <h3 className="text-lg font-bold text-gray-900 pr-10">{sucursalSeleccionada.nombre}</h3>
      <p className="text-sm text-gray-500 mb-4">Zona: {sucursalSeleccionada.zona}</p>

      {/* Buscador de Causa Raíz (Alerta Dinámica) */}
      {!sucursalSeleccionada.metaAlcanzada && (
        <div className={`mb-5 p-4 rounded-lg border-l-4 ${sucursalSeleccionada.fallaPrincipal === 'Logística' ? 'bg-orange-50 border-orange-500' : 'bg-red-50 border-[#BA1A1A]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-5 h-5 ${sucursalSeleccionada.fallaPrincipal === 'Logística' ? 'text-orange-500' : 'text-[#BA1A1A]'}`} />
            <span className="font-bold text-gray-900">
              Causa Raíz Detectada: Falla {sucursalSeleccionada.fallaPrincipal}
            </span>
          </div>
          <p className="text-sm text-gray-700 ml-7">
            {sucursalSeleccionada.fallaPrincipal === 'Logística' 
              ? 'El repartidor excedió los tiempos planificados y/o se desvió de la geocerca. El pedido no se completó.'
              : 'Logística perfecta, pero reporte cualitativo indica fricción comercial en el punto de venta.'}
          </p>
        </div>
      )}

      {/* Tiempos de Ruta (KPI Logístico) */}
      <div className="mb-6 h-40">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" /> KPI: Tiempos en Ruta (Minutos)
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sucursalSeleccionada.tiemposRuta}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tramo" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="planificado" name="Planificado" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="real" name="Real" fill={sucursalSeleccionada.fallaPrincipal === 'Logística' ? '#BA1A1A' : '#001E40'} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {sucursalSeleccionada.fallaPrincipal === 'Logística' && (
          <p className="text-xs text-[#BA1A1A] mt-1 text-center font-medium animate-pulse">
            Sugerencia del Sistema: Reajustar planificación de ruta.
          </p>
        )}
      </div>

      {/* Reporte Cualitativo (Comercial/Reponedor) */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 pt-2 border-t border-gray-100">Reporte del Reponedor (Text-Mining)</h4>
        
        {sucursalSeleccionada.fallaPrincipal === 'Comercial' && sucursalSeleccionada.reporteReponedor.actitudEncargado && (
          <div className="bg-[#BA1A1A]/10 text-[#BA1A1A] p-2 rounded text-xs font-bold inline-block mb-2">
            Alerta NLP: {sucursalSeleccionada.reporteReponedor.actitudEncargado}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className={`p-3 rounded-lg flex items-center gap-3 ${sucursalSeleccionada.reporteReponedor.limpio ? 'bg-green-50' : 'bg-red-50'}`}>
            {sucursalSeleccionada.reporteReponedor.limpio ? <CheckCircle2 className="text-venaris-secondary w-5 h-5" /> : <XCircle className="text-[#BA1A1A] w-5 h-5" />}
            <span className="text-sm font-medium text-gray-700">Espacio Listo</span>
          </div>
          <div className={`p-3 rounded-lg flex items-center gap-3 ${sucursalSeleccionada.reporteReponedor.abastecido ? 'bg-green-50' : 'bg-red-50'}`}>
            {sucursalSeleccionada.reporteReponedor.abastecido ? <CheckCircle2 className="text-venaris-secondary w-5 h-5" /> : <XCircle className="text-[#BA1A1A] w-5 h-5" />}
            <span className="text-sm font-medium text-gray-700">Abastecido</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
          " {sucursalSeleccionada.reporteReponedor.observaciones} "
        </p>
      </div>
    </div>
  );
};
