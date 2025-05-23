import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { MainLayout } from './layouts/MainLayout';
import { lazy, Suspense } from 'react';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const DocumentDetailPage = lazy(() => import('./pages/DocumentDetailPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TailwindTestPage = lazy(() => import('./pages/TailwindTestPage'));

// Loading component for lazy loaded routes with Tailwind CSS
const PageLoader = () => (
  <div className="flex items-center justify-center h-60vh">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/:id" element={<DocumentDetailPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="tailwind-test" element={<TailwindTestPage />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
