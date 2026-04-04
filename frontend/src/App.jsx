import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PerformanceMonitor from './components/PerformanceMonitor';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import {
  preloadAddProductPage,
  preloadAdminDashboardPage,
  preloadAuthPage,
  preloadCartPage,
  preloadCheckoutPage,
  preloadLandingPage,
  preloadNotFoundPage,
  preloadOrderSuccessPage,
  preloadProductDetailPage,
  preloadProductsPage,
  preloadSellProductPage,
  preloadSellerPickupDashboard,
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
const UserDashboardPage = lazy(preloadUserDashboardPage);
const AdminDashboardPage = lazy(preloadAdminDashboardPage);
const AddProductPage = lazy(preloadAddProductPage);
const SellProductPage = lazy(preloadSellProductPage);
const SellerPickupDashboard = lazy(preloadSellerPickupDashboard);
const NotFoundPage = lazy(preloadNotFoundPage);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900">
      <PerformanceMonitor />
      <Navbar />
      <main>
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
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sell"
              element={
                <ProtectedRoute>
                  <SellProductPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/pickups"
              element={
                <ProtectedRoute>
                  <SellerPickupDashboard />
                </ProtectedRoute>
              }
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
              element={
                <AdminRoute>
                  <AddProductPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
