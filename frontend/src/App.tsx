import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from './graphql/client';
import { ProtectedRoute } from './shared/components/Layout/ProtectedRoute';

const LogisticaRoutes = lazy(() => import('./modules/logistica/routes/LogisticaRoutes'));
const Layout = lazy(() => import('./shared/components/Layout/Layout'));
const LoginPage = lazy(() => import('./modules/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('./modules/auth/pages/RegisterPage'));

const FullScreenLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      <p className="text-sm font-medium text-gray-500">Cargando Antigrabiti...</p>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-8 bg-red-50 border border-red-200 rounded text-red-900">
          <h1 className="text-2xl font-bold mb-4">Error Fatal en React</h1>
          <pre className="text-sm overflow-auto">{this.state.error?.toString()}</pre>
          <pre className="text-sm overflow-auto mt-4">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <BrowserRouter>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              {/* Rutas Públicas (Auth) */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />

              {/* Rutas Protegidas (Dashboard) */}
              <Route path="/" element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<Navigate to="/logistica/dashboard" replace />} />
                  <Route path="logistica/*" element={<LogisticaRoutes />} />
                </Route>
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ApolloProvider>
    </ErrorBoundary>
  );
};
