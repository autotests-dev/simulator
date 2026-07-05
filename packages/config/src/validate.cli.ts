import { SimulatorConfigSchema } from './schema';
import { config } from './simulator.config';

const result = SimulatorConfigSchema.safeParse(config);

if (!result.success) {
  console.error('✗ simulator.config is INVALID:\n');
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '(root)';
    console.error(`  • ${path}: ${issue.message}`);
  }
  process.exit(1);
}

const c = result.data;
const outOfStock = c.seed.products.filter((p) => p.stock === 0).length;
const onSale = c.seed.products.filter((p) => p.compareAtCents !== undefined).length;

console.log(`✓ simulator.config is valid — ${c.meta.product}`);
console.log(`  profiles:   ${c.profiles.length}`);
console.log(`  categories: ${c.seed.categories.length}`);
console.log(
  `  products:   ${c.seed.products.length} (${outOfStock} out of stock, ${onSale} on sale)`,
);
console.log(`  coupons:    ${c.seed.coupons.length}`);
