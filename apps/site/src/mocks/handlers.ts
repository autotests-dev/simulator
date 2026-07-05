import { http, HttpResponse } from 'msw';
import { config } from '@autotests-simulator/config';
import { domain, DomainError } from '@autotests-simulator/domain';
import type {
  Address,
  AdminOrderQuery,
  AdminProductQuery,
  BulkAction,
  ProductInput,
  ProductPatch,
} from '@autotests-simulator/domain';
import { createRng, createTiming } from '@autotests-simulator/sim-kit';

const latencyRng = createRng((config.defaults.seed ^ 0x9e3779b9) >>> 0);

async function networkDelay(kind: 'read' | 'write'): Promise<void> {
  const slow = domain.behaviors().slowNetwork;
  const timing = createTiming({ rng: latencyRng, slowFactor: slow ? 3 : 1 });
  await timing.latency(kind === 'read' ? [90, 240] : [140, 360]);
}

function fail(error: unknown) {
  if (error instanceof DomainError) {
    return HttpResponse.json(
      { message: error.message, fieldErrors: error.fieldErrors, code: error.code },
      { status: error.status },
    );
  }
  return HttpResponse.json({ message: 'Something went wrong on our end.' }, { status: 500 });
}

function serverBusy() {
  return HttpResponse.json(
    { message: 'The server is having a moment — please try again.' },
    { status: 503 },
  );
}

function cartChanged(): void {
  window.dispatchEvent(new CustomEvent('kotes:cart-changed'));
}
function sessionChanged(): void {
  window.dispatchEvent(new CustomEvent('kotes:session-changed'));
}

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating';
const SORTS: SortKey[] = ['featured', 'price-asc', 'price-desc', 'rating'];

type JsonBody = Parameters<typeof HttpResponse.json>[0];
type HandlerInfo = {
  request: Request;
  params: Record<string, string | readonly string[] | undefined>;
};

function respond(
  kind: 'read' | 'write',
  resolve: (info: HandlerInfo) => JsonBody | void | Promise<JsonBody | void>,
  init?: { status?: number },
) {
  return async (info: HandlerInfo) => {
    await networkDelay(kind);
    if (domain.tickSession()) sessionChanged();
    if (kind === 'write' && domain.rollWriteFailure()) return serverBusy();
    try {
      const body = await resolve(info);
      return HttpResponse.json(body ?? { ok: true }, init);
    } catch (error) {
      return fail(error);
    }
  };
}

function pageQuery(request: Request): { page: number; pageSize: number | undefined } {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') ?? '1') || 1;
  const pageSizeParam = url.searchParams.get('pageSize');
  const pageSize = pageSizeParam ? Number(pageSizeParam) || undefined : undefined;
  return { page, pageSize };
}

export const handlers = [
  http.get(
    '/api/categories',
    respond('read', () => domain.getCategories()),
  ),

  http.get(
    '/api/products',
    respond('read', ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get('category') ?? undefined;
      const search = url.searchParams.get('search') ?? undefined;
      const rawSort = url.searchParams.get('sort');
      const sort = rawSort && SORTS.includes(rawSort as SortKey) ? (rawSort as SortKey) : undefined;
      return domain.listProducts({ category, search, sort, ...pageQuery(request) });
    }),
  ),

  http.get(
    '/api/products/:slug',
    respond('read', ({ params }) => domain.getProduct(String(params.slug))),
  ),

  http.get(
    '/api/products/:slug/reviews',
    respond('read', ({ request, params }) =>
      domain.listReviews(String(params.slug), { page: pageQuery(request).page }),
    ),
  ),

  http.post(
    '/api/products/:slug/reviews',
    respond(
      'write',
      async ({ request, params }) => {
        const body = (await request.json()) as { rating: number; body: string };
        return domain.addReview(String(params.slug), body);
      },
      { status: 201 },
    ),
  ),

  http.get(
    '/api/cart',
    respond('read', () => domain.getCart()),
  ),

  http.post(
    '/api/cart/items',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as {
        productId: string;
        variant?: Record<string, string>;
        qty?: number;
      };
      return domain.addToCart(body);
    }),
  ),

  http.patch(
    '/api/cart/items/:lineId',
    respond('write', async ({ request, params }) => {
      const body = (await request.json()) as { qty: number };
      return domain.updateCartLine(String(params.lineId), body.qty);
    }),
  ),

  http.delete(
    '/api/cart/items/:lineId',
    respond('write', ({ params }) => domain.removeCartLine(String(params.lineId))),
  ),

  http.post(
    '/api/cart/coupon',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as { code: string };
      return domain.applyCoupon(body.code);
    }),
  ),

  http.delete(
    '/api/cart/coupon',
    respond('write', () => domain.removeCoupon()),
  ),

  http.post(
    '/api/checkout',
    respond(
      'write',
      async ({ request }) => {
        const body = (await request.json()) as { email: string; address: Partial<Address> };
        const order = domain.checkout(body);
        cartChanged();
        return order;
      },
      { status: 201 },
    ),
  ),

  http.get(
    '/api/me',
    respond('read', () => ({ user: domain.me() })),
  ),

  http.post(
    '/api/auth/login',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as { email: string; password: string };
      const user = domain.login(body.email, body.password);
      sessionChanged();
      cartChanged();
      return { user };
    }),
  ),

  http.post(
    '/api/auth/logout',
    respond('write', () => {
      domain.logout();
      sessionChanged();
      cartChanged();
    }),
  ),

  http.post(
    '/api/auth/signup',
    respond(
      'write',
      async ({ request }) => {
        const body = (await request.json()) as { name: string; email: string; password: string };
        const user = domain.signup(body);
        sessionChanged();
        cartChanged();
        return { user };
      },
      { status: 201 },
    ),
  ),

  http.post(
    '/api/auth/forgot',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as { email: string };
      domain.requestPasswordReset(body.email);
    }),
  ),

  http.post(
    '/api/newsletter',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as { email: string };
      domain.subscribeNewsletter(body.email);
    }),
  ),

  http.get(
    '/api/orders',
    respond('read', ({ request }) => domain.listOrders(pageQuery(request))),
  ),

  http.get(
    '/api/orders/:id',
    respond('read', ({ params }) => domain.getOrder(String(params.id))),
  ),

  http.get(
    '/api/addresses',
    respond('read', () => domain.listAddresses()),
  ),

  http.post(
    '/api/addresses',
    respond(
      'write',
      async ({ request }) => {
        const body = (await request.json()) as Partial<Address>;
        return domain.addAddress(body);
      },
      { status: 201 },
    ),
  ),

  http.patch(
    '/api/addresses/:id',
    respond('write', async ({ request, params }) => {
      const body = (await request.json()) as Partial<Address>;
      return domain.updateAddress(String(params.id), body);
    }),
  ),

  http.delete(
    '/api/addresses/:id',
    respond('write', ({ params }) => domain.removeAddress(String(params.id))),
  ),

  http.get(
    '/api/admin/summary',
    respond('read', () => domain.adminSummary()),
  ),

  http.get(
    '/api/admin/orders',
    respond('read', ({ request }) => {
      const url = new URL(request.url);
      const statusRaw = url.searchParams.get('status') ?? '';
      const status = (
        ['all', 'processing', 'shipped', 'delivered'].includes(statusRaw) ? statusRaw : undefined
      ) as AdminOrderQuery['status'];
      return domain.adminListOrders({
        search: url.searchParams.get('search') ?? undefined,
        status,
        sort: (url.searchParams.get('sort') ?? undefined) as AdminOrderQuery['sort'],
        page: pageQuery(request).page,
      });
    }),
  ),

  http.get(
    '/api/admin/products',
    respond('read', ({ request }) => {
      const url = new URL(request.url);
      const stockStatusRaw = url.searchParams.get('stockStatus') ?? '';
      const stockStatus = (
        ['in', 'low', 'out', 'all'].includes(stockStatusRaw) ? stockStatusRaw : undefined
      ) as AdminProductQuery['stockStatus'];
      return domain.adminListProducts({
        search: url.searchParams.get('search') ?? undefined,
        stockStatus,
        sort: (url.searchParams.get('sort') ?? undefined) as AdminProductQuery['sort'],
        page: pageQuery(request).page,
      });
    }),
  ),

  http.get(
    '/api/admin/products/:id',
    respond('read', ({ params }) => domain.adminGetProduct(String(params.id))),
  ),

  http.post(
    '/api/admin/products',
    respond(
      'write',
      async ({ request }) => {
        const body = (await request.json()) as ProductInput;
        return domain.adminCreateProduct(body);
      },
      { status: 201 },
    ),
  ),

  http.patch(
    '/api/admin/products/:id',
    respond('write', async ({ request, params }) => {
      const body = (await request.json()) as ProductPatch;
      return domain.adminUpdateProduct(String(params.id), body);
    }),
  ),

  http.delete(
    '/api/admin/products/:id',
    respond('write', ({ params }) => {
      domain.adminDeleteProduct(String(params.id));
    }),
  ),

  http.post(
    '/api/admin/products/bulk',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as { ids: string[]; action: BulkAction };
      return domain.adminBulkUpdate(body.ids, body.action);
    }),
  ),

  http.patch(
    '/api/admin/products/:id/published',
    respond('write', async ({ request, params }) => {
      const body = (await request.json()) as { published: boolean };
      return domain.adminSetPublished(String(params.id), body.published);
    }),
  ),

  http.get(
    '/api/admin/products/:id/notes',
    respond('read', ({ params }) => domain.adminListNotes(String(params.id))),
  ),

  http.post(
    '/api/admin/products/:id/notes',
    respond(
      'write',
      async ({ request, params }) => {
        const body = (await request.json()) as { body: string };
        return domain.adminAddNote(String(params.id), body.body);
      },
      { status: 201 },
    ),
  ),

  http.get(
    '/api/account/payment-methods',
    respond('read', () => domain.listPaymentMethods()),
  ),

  http.post(
    '/api/auth/reauth',
    respond('write', async ({ request }) => {
      const body = (await request.json()) as { password: string };
      domain.reauth(body.password);
    }),
  ),

  http.post(
    '/api/contact',
    respond(
      'write',
      async ({ request }) => {
        const form = await request.formData();
        const attachment = form.get('attachment');
        const orderNumber = form.get('orderNumber');
        return domain.submitContact({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          topic: String(form.get('topic') ?? ''),
          message: String(form.get('message') ?? ''),
          orderNumber: orderNumber ? String(orderNumber) : undefined,
          attachmentName:
            attachment instanceof File && attachment.name ? attachment.name : undefined,
        });
      },
      { status: 201 },
    ),
  ),
];
