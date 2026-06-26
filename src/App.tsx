import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from '@/lib/store';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import IndustryPage from '@/pages/IndustryPage';
import ProjectPage from '@/pages/ProjectPage';
import SupplierSetupPage from '@/pages/SupplierSetupPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDashboard from '@/pages/ProjectDashboard';
import ProjectSuppliersPage from '@/pages/ProjectSuppliersPage';
import SupplierDetailPage from '@/pages/SupplierDetailPage';
import DocReviewPage from '@/pages/DocReviewPage';
import CostBuilderPage from '@/pages/CostBuilderPage';
import ScenariosPage from '@/pages/ScenariosPage';
import NetworkSuppliersPage from '@/pages/NetworkSuppliersPage';

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<IndustryPage />} />
          <Route path="/onboarding/project" element={<ProjectPage />} />
          <Route path="/onboarding/supplier" element={<SupplierSetupPage />} />

          <Route element={<AppLayout />}>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDashboard />} />
            <Route path="/projects/:projectId/suppliers" element={<ProjectSuppliersPage />} />
            <Route path="/projects/:projectId/suppliers/:supplierId" element={<SupplierDetailPage />} />
            <Route path="/projects/:projectId/suppliers/:supplierId/docs/:docId" element={<DocReviewPage />} />
            <Route path="/projects/:projectId/builder" element={<CostBuilderPage />} />
            <Route path="/projects/:projectId/scenarios" element={<ScenariosPage />} />
            <Route path="/network/suppliers" element={<NetworkSuppliersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
