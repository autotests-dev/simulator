import type { BadgeProps } from '@autotests-simulator/ui';
import type { OrderStatus } from '@autotests-simulator/domain';

export const STATUS_VARIANT: Record<OrderStatus, BadgeProps['variant']> = {
  processing: 'new',
  shipped: 'default',
  delivered: 'secondary',
};
