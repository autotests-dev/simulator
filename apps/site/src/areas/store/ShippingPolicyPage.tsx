import { config } from '@autotests-simulator/config';
import { useFormat } from '../../lib/hooks';

export function ShippingPolicyPage() {
  const { moneyWhole } = useFormat();
  const shipping = config.seed.shipping;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Shipping &amp; returns</h1>
      <div className="flex flex-col gap-4 text-muted-foreground">
        <p>
          Orders of {moneyWhole(shipping.freeThresholdCents)} or more ship free. Below that, a flat{' '}
          {moneyWhole(shipping.flatCents)} covers packing and carbon-neutral delivery — no surprises
          at checkout.
        </p>
        <p>
          Most orders leave our Portland warehouse within two business days. You’ll get a
          confirmation email the moment your order ships.
        </p>
        <p>
          Changed your mind? You have 30 days from delivery to send anything back in its original
          condition — no questions asked. Refunds land on your original payment method within a few
          days of us receiving the return.
        </p>
        <p>
          If anything arrives damaged, reply to your order confirmation and we’ll make it right.
        </p>
      </div>
    </div>
  );
}
