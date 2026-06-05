import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { mockSpaceShareData, mockSpaceShareGlobal } from '../store/useDashboardStore';

export const PanelSpaceShare: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Space Share Global</h3>
      <p className="text-sm text-gray-500 mb-4">Estado actual en góndolas (Captura del momento actual)</p>
      
      {/* Gráfico Circular (Torta) para el estado actual Global (Cumpliendo el estándar 4.2) */}
      <div className="h-40 mb-6 flex flex-col items-center">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cuota de Mercado Total (%)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mockSpaceShareGlobal}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {mockSpaceShareGlobal.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Barras para el desglose por sucursal (Estado actual estático) */}
      <div className="flex-1 min-h-0 h-48 border-t border-gray-100 pt-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Desglose por Puntos de Venta Críticos</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={mockSpaceShareData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="nombre" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{fill: '#F9FAFB'}}
            />
            <Bar dataKey="venado" name="Venaris" stackId="a" fill="#001E40" radius={[0, 0, 4, 4]} />
            <Bar dataKey="competencia" name="Competencia" stackId="a" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
