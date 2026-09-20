import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout } from './SiteLayout';
import { RouteBoundary } from './RouteBoundary';
const LandingPage = lazy(() =>
  import('../areas/landing/LandingPage').then((module) => ({ default: module.LandingPage })),
);
const CatalogPage = lazy(() =>
  import('../areas/store/CatalogPage').then((module) => ({ default: module.CatalogPage })),
);
const ProductPage = lazy(() =>
  import('../areas/store/ProductPage').then((module) => ({ default: module.ProductPage })),
);
const CartPage = lazy(() =>
  import('../areas/store/CartPage').then((module) => ({ default: module.CartPage })),
);
const CheckoutPage = lazy(() =>
  import('../areas/store/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
);
const OrderConfirmationPage = lazy(() =>
  import('../areas/store/OrderConfirmationPage').then((module) => ({
    default: module.OrderConfirmationPage,
  })),
);
const AccountPage = lazy(() =>
  import('../areas/store/AccountPage').then((module) => ({ default: module.AccountPage })),
);
const LoginPage = lazy(() =>
  import('../areas/store/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const SignupPage = lazy(() =>
  import('../areas/store/SignupPage').then((module) => ({ default: module.SignupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../areas/store/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ShippingPolicyPage = lazy(() =>
  import('../areas/store/ShippingPolicyPage').then((module) => ({
    default: module.ShippingPolicyPage,
  })),
);
const AboutPage = lazy(() =>
  import('../areas/info/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const SustainabilityPage = lazy(() =>
  import('../areas/info/SustainabilityPage').then((module) => ({
    default: module.SustainabilityPage,
  })),
);
const StockistsPage = lazy(() =>
  import('../areas/info/StockistsPage').then((module) => ({ default: module.StockistsPage })),
);
const CarePage = lazy(() =>
  import('../areas/info/CarePage').then((module) => ({ default: module.CarePage })),
);
const ContactPage = lazy(() =>
  import('../areas/info/ContactPage').then((module) => ({ default: module.ContactPage })),
);
const NotFoundPage = lazy(() =>
  import('../areas/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const BackofficeLayout = lazy(() =>
  import('../areas/backoffice/BackofficeLayout').then((module) => ({
    default: module.BackofficeLayout,
  })),
);
const DashboardPage = lazy(() =>
  import('../areas/backoffice/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const OrdersPage = lazy(() =>
  import('../areas/backoffice/OrdersPage').then((module) => ({ default: module.OrdersPage })),
);
const ProductsPage = lazy(() =>
  import('../areas/backoffice/ProductsPage').then((module) => ({ default: module.ProductsPage })),
);
const ProductEditPage = lazy(() =>
  import('../areas/backoffice/ProductEditPage').then((module) => ({
    default: module.ProductEditPage,
  })),
);
const ProductWizardPage = lazy(() =>
  import('../areas/backoffice/ProductWizardPage').then((module) => ({
    default: module.ProductWizardPage,
  })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function App() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollToTop />
      <RouteBoundary key={pathname}>
        <Suspense
          fallback={
            <div role="status" className="p-8 text-center text-muted-foreground">
              Opening page…
            </div>
          }
        >
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/store" element={<CatalogPage />} />
              <Route path="/store/p/:slug" element={<ProductPage />} />
              <Route path="/store/cart" element={<CartPage />} />
              <Route path="/store/checkout" element={<CheckoutPage />} />
              <Route path="/store/order/:id" element={<OrderConfirmationPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/policies/shipping" element={<ShippingPolicyPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/sustainability" element={<SustainabilityPage />} />
              <Route path="/stockists" element={<StockistsPage />} />
              <Route path="/care" element={<CarePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="/backoffice" element={<BackofficeLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductWizardPage />} />
              <Route path="products/:id" element={<ProductEditPage />} />
            </Route>
          </Routes>
        </Suspense>
      </RouteBoundary>
    </>
  );
}
