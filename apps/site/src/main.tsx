import '@fontsource-variable/plus-jakarta-sans';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { withTimeout } from '@autotests-simulator/sim-kit';
import { App } from './app/App';
import { SessionProvider } from './app/SessionContext';
import { CartProvider } from './app/CartContext';
import { ToastProvider } from './app/ToastContext';
import { StartupScreen } from './app/StartupScreen';

const el = document.getElementById('root');
if (!el) throw new Error('Missing #root element');
const root = createRoot(el);
root.render(<StartupScreen />);

let startupFailed = false;
let stopWorker: (() => void) | undefined;

async function startWorker() {
  const { resetDomain, prepareDomainStorage } = await import('@autotests-simulator/domain');
  if (startupFailed) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === '1') resetDomain();
  prepareDomainStorage();

  const { worker } = await import('./mocks/browser');
  if (startupFailed) return;
  stopWorker = () => worker.stop();
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  if (startupFailed) worker.stop();
}

async function bootstrap() {
  await withTimeout(startWorker(), 15_000);
  root.render(
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

void bootstrap().catch((error: unknown) => {
  startupFailed = true;
  stopWorker?.();
  console.error('Kote’s startup failed', error);
  root.render(<StartupScreen failed />);
});
