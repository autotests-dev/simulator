import { cn } from '@autotests-simulator/ui';

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function ProductImage({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const hue = hashHue(slug);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <div
      aria-hidden="true"
      className={cn('flex items-center justify-center', className)}
      style={{
        background: `linear-gradient(135deg, oklch(0.88 0.07 ${hue}), oklch(0.74 0.13 ${(hue + 38) % 360}))`,
      }}
    >
      <span className="text-3xl font-black tracking-tight text-white/75">{initials}</span>
    </div>
  );
}
