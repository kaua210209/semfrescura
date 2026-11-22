import { Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import PublicLayout from './components/PublicLayout.jsx'
import Home from './pages/Home.jsx'
import MenuPage from './pages/MenuPage.jsx'
import Checkout from './pages/Checkout.jsx'
import Track from './pages/Track.jsx'
import Login from './pages/admin/Login.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Orders from './pages/admin/Orders.jsx'
import AdminMenu from './pages/admin/AdminMenu.jsx'
import Featured from './pages/admin/Featured.jsx'
import CarouselAdmin from './pages/admin/CarouselAdmin.jsx'
import ReviewsAdmin from './pages/admin/ReviewsAdmin.jsx'
import Reports from './pages/admin/Reports.jsx'
import SettingsAdmin from './pages/admin/SettingsAdmin.jsx'

export default function App() {
  return (
    <SettingsProvider>
      <CartProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="pedido" element={<MenuPage />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="acompanhar/:id" element={<Track />} />
            </Route>

            <Route path="admin/login" element={<Login />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Orders />} />
              <Route path="cardapio" element={<AdminMenu />} />
              <Route path="destaques" element={<Featured />} />
              <Route path="carrossel" element={<CarouselAdmin />} />
              <Route path="avaliacoes" element={<ReviewsAdmin />} />
              <Route path="relatorios" element={<Reports />} />
              <Route path="configuracoes" element={<SettingsAdmin />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </CartProvider>
    </SettingsProvider>
  )
}
