import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout } from './SiteLayout';
import { LandingPage } from '../areas/landing/LandingPage';
import { CatalogPage } from '../areas/store/CatalogPage';
import { ProductPage } from '../areas/store/ProductPage';
import { CartPage } from '../areas/store/CartPage';
import { CheckoutPage } from '../areas/store/CheckoutPage';
import { OrderConfirmationPage } from '../areas/store/OrderConfirmationPage';
import { AccountPage } from '../areas/store/AccountPage';
import { LoginPage } from '../areas/store/LoginPage';
import { SignupPage } from '../areas/store/SignupPage';
import { ForgotPasswordPage } from '../areas/store/ForgotPasswordPage';
import { ShippingPolicyPage } from '../areas/store/ShippingPolicyPage';
import { AboutPage } from '../areas/info/AboutPage';
import { SustainabilityPage } from '../areas/info/SustainabilityPage';
import { StockistsPage } from '../areas/info/StockistsPage';
import { CarePage } from '../areas/info/CarePage';
import { ContactPage } from '../areas/info/ContactPage';
import { NotFoundPage } from '../areas/NotFoundPage';
import { BackofficeLayout } from '../areas/backoffice/BackofficeLayout';
import { DashboardPage } from '../areas/backoffice/DashboardPage';
import { OrdersPage } from '../areas/backoffice/OrdersPage';
import { ProductsPage } from '../areas/backoffice/ProductsPage';
import { ProductEditPage } from '../areas/backoffice/ProductEditPage';
import { ProductWizardPage } from '../areas/backoffice/ProductWizardPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
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
    </>
  );
}
