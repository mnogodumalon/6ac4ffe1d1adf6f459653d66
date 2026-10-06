import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import FirmenPage from '@/pages/FirmenPage';
import AnsprechpartnerPage from '@/pages/AnsprechpartnerPage';
import PublicFormFirmen from '@/pages/public/PublicForm_Firmen';
import PublicFormAnsprechpartner from '@/pages/public/PublicForm_Ansprechpartner';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6ac4ffd3537dbc97ceb2db87" element={<PublicFormFirmen />} />
              <Route path="public/6ac4ffd7e150bc77fa35cc66" element={<PublicFormAnsprechpartner />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="firmen" element={<FirmenPage />} />
                <Route path="ansprechpartner" element={<AnsprechpartnerPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
