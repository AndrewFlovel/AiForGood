import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const RutasMapaPage = lazy(() => import('../pages/RutasMapaPage'));
const EventosPage = lazy(() => import('../pages/EventosPage'));

const ModuleLoader = () => (
  <div className="flex h-full w-full items-center justify-center p-12">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
  </div>
);

const LogisticaRoutes: React.FC = () => {
  return (
    <Suspense fallback={<ModuleLoader />}>
      <Routes>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="rutas" element={<RutasMapaPage />} />
        <Route path="eventos" element={<EventosPage />} />
      </Routes>
    </Suspense>
  );
};

export default LogisticaRoutes;
