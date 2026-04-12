import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { ToastProvider } from './services/ToastContext';
import { ToastContainer } from './components/Toast';
import {
  preloadAdminDashboardPage,
  preloadAuthPage,
  preloadCartPage,
  preloadCheckoutPage,
  preloadLandingPage,
  preloadNotFoundPage,
  preloadOrderSuccessPage,
  preloadProductDetailPage,
  preloadProductsPage,
  preloadSellerPortalPage,
  preloadUserDashboardPage,
  warmLikelyRoutes,
} from './utils/preloadRoutes';

const LandingPage = lazy(preloadLandingPage);
const AuthPage = lazy(preloadAuthPage);
const ProductsPage = lazy(preloadProductsPage);
const ProductDetailPage = lazy(preloadProductDetailPage);
const CartPage = lazy(preloadCartPage);
const CheckoutPage = lazy(preloadCheckoutPage);
const OrderSuccessPage = lazy(preloadOrderSuccessPage);
const HubPage = lazy(() => import('./pages/HubPage'));
const UserDashboardPage = lazy(preloadUserDashboardPage);
const AdminDashboardPage = lazy(preloadAdminDashboardPage);
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'));
const SellerPortalPage = lazy(preloadSellerPortalPage);
const NotFoundPage = lazy(preloadNotFoundPage);

import SupportChatWidget from './components/SupportChatWidget';

function RouteLoader() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="glass-panel soft-ring animate-fade-in rounded-2xl p-6 text-center text-slate-600">
        Loading page...
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    const runWarmup = () => {
      warmLikelyRoutes();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(runWarmup, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(runWarmup, 500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#020617] text-white">
        <Navbar />
        <main className="pt-32">
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order-success/:id"
                element={
                  <ProtectedRoute>
                    <OrderSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order/:id"
                element={
                  <ProtectedRoute>
                    <OrderSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/select-role"
                element={
                  <ProtectedRoute>
                    <RoleSelectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub"
                element={
                  <ProtectedRoute>
                    <HubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={<Navigate to="/hub" replace />}
              />
              <Route
                path="/seller/dashboard"
                element={<Navigate to="/hub" replace />}
              />
              <Route
                path="/sell"
                element={<Navigate to="/seller/dashboard" replace />}
              />
              <Route
                path="/seller/pickups"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/add-product"
                element={<Navigate to="/admin" replace />}
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <ToastContainer />
        <SupportChatWidget />
      </div>
    </ToastProvider>
  );
}

export default App;

