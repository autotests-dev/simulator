import type {
  BehaviorAssignments,
  Product,
  ProductVariant,
  Role,
} from '@autotests-simulator/config';

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode?: string;
  freeShippingApplied: boolean;
};

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
  qty: number;
  variant?: Record<string, string>;
  lineTotalCents: number;
  stock: number;
};

export type Cart = {
  lines: CartLine[];
  couponCode?: string;
  couponNote?: string;
  totals: Totals;
};

export type Address = {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  priceCents: number;
  qty: number;
  variant?: Record<string, string>;
};

export type OrderStatus = 'processing' | 'shipped' | 'delivered';

export type Order = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  totals: Totals;
  email: string;
  shippingAddress?: Address;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  locale: string;
  behaviors: BehaviorAssignments;
};

export type BehaviorsView = {
  role: Role;
  locale: string;
  slowNetwork: boolean;
};

export type ProductListItem = Product & { inStock: boolean; published: boolean };

export type Note = { id: string; body: string; createdAt: string };

export type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type ProductPage = {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type OrderPage = {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ProductQuery = {
  category?: string;
  search?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'rating';
  page?: number;
  pageSize?: number;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type ReviewInput = {
  rating: number;
  body: string;
};

export type SignupInput = {
  name: string;
  email: string;
  password: string;
};

export type AdminOrderRow = Order & { customer: string };

export type AdminOrderQuery = {
  search?: string;
  status?: 'all' | OrderStatus;
  sort?: 'date-desc' | 'date-asc' | 'total-asc' | 'total-desc';
  page?: number;
};

export type AdminOrderPage = {
  items: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ReviewPage = {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ProductBadge = NonNullable<Product['badge']>;

export type AdminSummary = {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  onSale: number;
  inventoryUnits: number;
};

export type AdminProductQuery = {
  search?: string;
  stockStatus?: 'all' | 'in' | 'low' | 'out';
  sort?: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';
  page?: number;
  pageSize?: number;
};

export type ProductOverride = {
  name?: string;
  priceCents?: number;
  compareAtCents?: number | null;
  badge?: ProductBadge | null;
  published?: boolean;
};

export type ProductPatch = ProductOverride & { stock?: number };

export type ProductInput = {
  name: string;
  category: string;
  blurb: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  stock: number;
  badge?: ProductBadge;
  variants?: ProductVariant[];
};

export type ContactInput = {
  name: string;
  email: string;
  topic: string;
  message: string;
  orderNumber?: string;
  attachmentName?: string;
};

export type ContactReceipt = {
  reference: string;
  attachmentName?: string;
};

export type BulkAction = 'restock' | 'markOnSale';
export type BulkResultRow = { id: string; name: string; ok: boolean; error?: string };
export type BulkResult = {
  action: BulkAction;
  results: BulkResultRow[];
  updated: number;
  skipped: number;
};
