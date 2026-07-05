import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Cart } from '@autotests-simulator/domain';
import { api } from '../lib/api';

type AddInput = { productId: string; variant?: Record<string, string>; qty?: number };

type CartValue = {
  cart: Cart | null;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (input: AddInput) => Promise<Cart>;
  updateLine: (lineId: string, qty: number) => Promise<Cart>;
  removeLine: (lineId: string) => Promise<Cart>;
  applyCoupon: (code: string) => Promise<Cart>;
  removeCoupon: () => Promise<Cart>;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCart(await api.get<Cart>('/api/cart'));
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener('kotes:cart-changed', handler);
    return () => window.removeEventListener('kotes:cart-changed', handler);
  }, [refresh]);

  const addItem = useCallback(async (input: AddInput) => {
    const c = await api.post<Cart>('/api/cart/items', input);
    setCart(c);
    return c;
  }, []);
  const updateLine = useCallback(async (lineId: string, qty: number) => {
    const c = await api.patch<Cart>(`/api/cart/items/${encodeURIComponent(lineId)}`, { qty });
    setCart(c);
    return c;
  }, []);
  const removeLine = useCallback(async (lineId: string) => {
    const c = await api.del<Cart>(`/api/cart/items/${encodeURIComponent(lineId)}`);
    setCart(c);
    return c;
  }, []);
  const applyCoupon = useCallback(async (code: string) => {
    const c = await api.post<Cart>('/api/cart/coupon', { code });
    setCart(c);
    return c;
  }, []);
  const removeCoupon = useCallback(async () => {
    const c = await api.del<Cart>('/api/cart/coupon');
    setCart(c);
    return c;
  }, []);

  const value = useMemo<CartValue>(() => {
    const count = cart ? cart.lines.reduce((n, l) => n + l.qty, 0) : 0;
    return {
      cart,
      count,
      loading,
      refresh,
      addItem,
      updateLine,
      removeLine,
      applyCoupon,
      removeCoupon,
    };
  }, [cart, loading, refresh, addItem, updateLine, removeLine, applyCoupon, removeCoupon]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
