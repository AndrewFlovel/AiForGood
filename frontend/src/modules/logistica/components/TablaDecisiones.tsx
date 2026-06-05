import React from 'react';
import { useDashboardStore, mockSpaceShareData } from '../store/useDashboardStore';
import { ChevronRight } from 'lucide-react';

export const TablaDecisiones: React.FC = () => {
  const { sucursales, setSucursalSeleccionada, sucursalSeleccionada } = useDashboardStore();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6 animate-in fade-in duration-500">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
        <div>
          <h3 className="text-lg font-bold text-venaris-primary">Matriz de Toma de Decisiones</h3>
          <p className="text-sm text-gray-500">Análisis comparativo de sucursales para intervención rápida.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              <th className="p-4 pl-6">Sucursal / Zona</th>
              <th className="p-4">Rendimiento (Último Mes)</th>
              <th className="p-4">Space Share (Venado)</th>
              <th className="p-4">Logística (Desvío)</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {sucursales.map((sucursal) => {
              const isSelected = sucursalSeleccionada?.id === sucursal.id;
              // Último mes de ventas (Marzo)
              const ultimaVenta = sucursal.ventasHistoricas[sucursal.ventasHistoricas.length - 1].ventas;
              const porcentajeVenta = Math.min((ultimaVenta / 500) * 100, 100); // Asumiendo meta de 500
              
              // Buscar share
              const share = mockSpaceShareData.find(s => s.nombre === sucursal.nombre) || { venado: 50 };
              
              return (
                <tr 
                  key={sucursal.id} 
                  className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-4 pl-6">
                    <div className="font-bold text-gray-900">{sucursal.nombre}</div>
                    <div className="text-xs text-gray-500">{sucursal.zona}</div>
                  </td>
                  
                  {/* Celda: Rendimiento (Barra Horizontal) */}
                  <td className="p-4 w-48">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{ultimaVenta} und</span>
                      <span className={sucursal.metaAlcanzada ? 'text-venaris-secondary' : 'text-venaris-tertiary'}>
                        {sucursal.metaAlcanzada ? 'Meta' : 'Bajo'}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${sucursal.metaAlcanzada ? 'bg-venaris-secondary' : 'bg-venaris-tertiary'}`}
                        style={{ width: `${porcentajeVenta}%` }}
                      ></div>
                    </div>
                  </td>

                  {/* Celda: Space Share (Barra Apilada CSS) */}
                  <td className="p-4 w-48">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-venaris-primary">{share.venado}% Venado</span>
                      <span className="text-gray-400">Comp.</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex">
                      <div className="h-full bg-venaris-primary" style={{ width: `${share.venado}%` }}></div>
                      <div className="h-full bg-gray-300" style={{ width: `${100 - share.venado}%` }}></div>
                    </div>
                  </td>

                  {/* Celda: Logística */}
                  <td className="p-4">
                    {sucursal.cumplimientoRuta.aTiempo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Óptimo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        +{sucursal.cumplimientoRuta.desvioMts}m Desvío
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <button 
                      onClick={() => setSucursalSeleccionada(sucursal)}
                      className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Analizar <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
