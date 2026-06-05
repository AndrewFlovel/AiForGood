import React, { useState } from 'react';
import { Users, Store, Route as RouteIcon } from 'lucide-react';
import { TabReponedores } from '../components/TabReponedores';
import { TabLocalesPDV } from '../components/TabLocalesPDV';
import { TabAsignarRuta } from '../components/TabAsignarRuta';

type TabKey = 'reponedores' | 'pdvs' | 'asignar';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'reponedores', label: 'Reponedores', icon: Users },
  { key: 'pdvs', label: 'Locales PDV', icon: Store },
  { key: 'asignar', label: 'Asignar Ruta', icon: RouteIcon },
];

const RegistroAsignacionPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('reponedores');

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-venaris-primary">Registro y Asignación</h2>
        <p className="text-gray-500 text-sm">
          Gestiona reponedores, locales de clientes y asigna rutas por disponibilidad y proximidad.
        </p>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-venaris-primary text-venaris-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'reponedores' && <TabReponedores />}
      {tab === 'pdvs' && <TabLocalesPDV />}
      {tab === 'asignar' && <TabAsignarRuta />}
    </div>
  );
};

export default RegistroAsignacionPage;
