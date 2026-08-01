import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import SplashScreen from "./components/splash/SplashScreen";
import Home from "./pages/Home";
import CategoryListing from "./pages/CategoryListing";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import AmbientBackground from "./components/ui/AmbientBackground";
import CustomerDetailsSheet from "./components/customer/CustomerDetailsSheet";
import { useCartFirestoreSync } from "./hooks/useCartFirestoreSync";
import { ProductsProvider } from "./contexts/ProductsContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import AdminRoute from "./components/admin/AdminRoute";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminUsers from "./pages/admin/AdminUsers";

const SPLASH_DURATION_MS = 4200;

// The customer-facing storefront — kept inside the fixed-width "phone
// screen" shell exactly as before.
function CustomerApp() {
  const [showSplash, setShowSplash] = useState(true);
  useCartFirestoreSync();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ProductsProvider>
      <div
        id="app-shell"
        className="relative w-full max-w-[430px] overflow-hidden bg-[#050505] text-white"
        style={{ transform: 'translateZ(0)', height: '100dvh' }}
      >
        <AmbientBackground />
        <SplashScreen visible={showSplash} />
        <div
          id="app-scroll"
          className="relative h-full w-full overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {!showSplash && (
            <div className="relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/category/:slug" element={<CategoryListing />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<OrderHistory />} />
              </Routes>
            </div>
          )}
        </div>
        <CustomerDetailsSheet />
      </div>
    </ProductsProvider>
  );
}

// The admin panel — deliberately rendered OUTSIDE the 430px mobile shell
// (full width) since staff will mostly manage orders from a desktop/laptop.
// Has its own auth provider so the customer flow never touches Firebase Auth.
function AdminApp() {
  return (
    <AdminAuthProvider>
      {/* Products/Categories management screens read the live catalog via
          useProducts(), so the admin panel needs its own ProductsProvider —
          separate from CustomerApp's, since the two shells never mount together. */}
      <ProductsProvider>
        <div
          className="relative w-full overflow-y-auto overflow-x-hidden"
          style={{ height: '100dvh', WebkitOverflowScrolling: 'touch' }}
        >
          <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route
              path="products"
              element={
                <AdminRoute>
                  <AdminProducts />
                </AdminRoute>
              }
            />
            <Route
              path="categories"
              element={
                <AdminRoute>
                  <AdminCategories />
                </AdminRoute>
              }
            />
            <Route
              path="invoices"
              element={
                <AdminRoute>
                  <AdminInvoices />
                </AdminRoute>
              }
            />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="*"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          </Routes>
        </div>
      </ProductsProvider>
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<CustomerApp />} />
      </Routes>

      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1a1512",
            border: "1px solid rgba(255,122,0,.4)",
            color: "#fff",
            fontSize: "12.5px",
          },
        }}
      />
    </>
  );
}
