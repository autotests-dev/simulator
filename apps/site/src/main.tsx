import '@fontsource-variable/plus-jakarta-sans';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { resetDomain } from '@autotests-simulator/domain';
import { App } from './app/App';
import { SessionProvider } from './app/SessionContext';
import { CartProvider } from './app/CartContext';
import { ToastProvider } from './app/ToastContext';

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === '1') resetDomain();

  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });

  const el = document.getElementById('root');
  if (!el) throw new Error('Missing #root element');

  createRoot(el).render(
    <StrictMode>
      <BrowserRouter>
        <SessionProvider>
          <CartProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CartProvider>
        </SessionProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
