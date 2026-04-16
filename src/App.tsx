import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';

import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { GameDetail } from './pages/GameDetail';
import { Checkout } from './pages/Checkout';
import { CheckoutPayment } from './pages/CheckoutPayment';
import { Success } from './pages/Success';
import { Marketplace } from './pages/Marketplace';
import { GameTopupHub } from './pages/GameTopupHub';
import { Topups } from './pages/Topups';
import { BuyGames } from './pages/BuyGames';
import { BuyGameId } from './pages/BuyGameId';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminRoute } from './components/admin/AdminRoute';
import { useAuth } from './hooks/useAuth.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state: auth } = useAuth();
  if (auth.isLoading) return <div className="p-20 text-center">Loading Data...</div>;
  if (!auth.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <div className="App selection:bg-[--color-primary] selection:text-white">
        <Routes>
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<GameDetail />} />
            <Route path="/checkout" element={
              <ProtectedRoute>
                 <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/checkout/payment" element={
              <ProtectedRoute>
                 <CheckoutPayment />
              </ProtectedRoute>
            } />
            <Route path="/order/:id" element={
              <ProtectedRoute>
                 <Success />
              </ProtectedRoute>
            } />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:slug" element={<GameTopupHub />} />
            <Route path="/topups" element={<Topups />} />
            <Route path="/buy-game-id" element={<BuyGameId />} />
            <Route path="/buy-games" element={<BuyGames />} />
          </Route>
        </Routes>

      </div>
    </Router>
  );
}

export default App;
