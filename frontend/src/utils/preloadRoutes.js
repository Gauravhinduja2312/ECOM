export const preloadLandingPage = () => import('../pages/LandingPage');
export const preloadAuthPage = () => import('../pages/AuthPage');
export const preloadProductsPage = () => import('../pages/ProductsPage');
export const preloadProductDetailPage = () => import('../pages/ProductDetailPage');
export const preloadCartPage = () => import('../pages/CartPage');
export const preloadCheckoutPage = () => import('../pages/CheckoutPage');
export const preloadOrderSuccessPage = () => import('../pages/OrderSuccessPage');
export const preloadUserDashboardPage = () => import('../pages/UserDashboardPage');
export const preloadAdminDashboardPage = () => import('../pages/AdminDashboardPage');
export const preloadAddProductPage = () => import('../pages/AddProductPage');
export const preloadSellProductPage = () => import('../pages/SellProductPage');
export const preloadSellerPickupDashboard = () => import('../pages/SellerPickupDashboard');
export const preloadNotFoundPage = () => import('../pages/NotFoundPage');

export function warmLikelyRoutes() {
  return Promise.allSettled([
    preloadProductsPage(),
    preloadCartPage(),
    preloadAuthPage(),
    preloadSellProductPage(),
  ]);
}