/**
 * Creates (or resets) a known admin user + a default brand for local development.
 *
 * - Creates/refreshes `admin@dev.local` (or DEV_SUPERUSER_EMAIL)
 * - Marks them as `isPlatformAdmin = true` so they can create brands
 * - Creates a "Default Brand" if no brand exists yet
 * - Adds the user as admin of that brand
 *
 * Refuses to run when NODE_ENV=production.
 */
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DEFAULT_LOW_STOCK_THRESHOLD, ROLES } from '@bilal/shared';

const DEFAULT_EMAIL = process.env.DEV_SUPERUSER_EMAIL ?? process.env.DEV_USER_EMAIL ?? 'admin@dev.local';
const DEFAULT_PASSWORD = process.env.DEV_SUPERUSER_PASSWORD ?? 'admin123456';
const AUTH_DRIVER = process.env.AUTH_DRIVER ?? 'supabase';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run in production.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  let userId: string;

  if (AUTH_DRIVER === 'dev') {
    const existing = await prisma.user.findUnique({ where: { email: DEFAULT_EMAIL } });
    if (existing) {
      userId = existing.id;
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true, fullName: 'Dev Admin', isPlatformAdmin: true },
      });
      console.info(`Reused existing user row ${DEFAULT_EMAIL}`);
    } else {
      userId = deterministicUuid(DEFAULT_EMAIL);
      await prisma.user.create({
        data: {
          id: userId,
          email: DEFAULT_EMAIL,
          fullName: 'Dev Admin',
          isActive: true,
          isPlatformAdmin: true,
        },
      });
      console.info(`Created public.users row for ${DEFAULT_EMAIL}`);
    }
  } else {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error(
        'AUTH_DRIVER=supabase but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing. Set AUTH_DRIVER=dev for local-only.',
      );
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error('Failed to list auth users:', listErr.message);
      process.exit(1);
    }
    const existing = list.users.find((u) => u.email === DEFAULT_EMAIL);

    if (existing) {
      userId = existing.id;
      const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });
      if (updErr) {
        console.error('Failed to reset password:', updErr.message);
        process.exit(1);
      }
      console.info(`Reset password for existing auth user ${DEFAULT_EMAIL}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Dev Admin' },
      });
      if (error || !data.user) {
        console.error('Failed to create auth user:', error?.message ?? 'unknown');
        process.exit(1);
      }
      userId = data.user.id;
      console.info(`Created auth user ${DEFAULT_EMAIL}`);
    }

    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: DEFAULT_EMAIL,
        fullName: 'Dev Admin',
        isActive: true,
        isPlatformAdmin: true,
      },
      update: { isActive: true, email: DEFAULT_EMAIL, isPlatformAdmin: true },
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: ROLES.ADMIN } });
  if (!adminRole) {
    console.error('Admin role not found. Run `pnpm --filter @bilal/api db:seed` first.');
    process.exit(1);
  }

  // Ensure a default brand exists, and the dev user is admin of it.
  let brand = await prisma.brand.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: 'Default Brand',
        slug: 'default',
        description: 'Auto-created on first dev setup. Rename or add more brands as needed.',
        createdBy: userId,
      },
    });
    await prisma.settings.create({
      data: {
        brandId: brand.id,
        key: 'low_stock_threshold',
        value: DEFAULT_LOW_STOCK_THRESHOLD,
        updatedBy: userId,
      },
    });
    console.info(`Created default brand "${brand.name}" (slug: ${brand.slug})`);
  }

  await prisma.brandMember.upsert({
    where: { brandId_userId: { brandId: brand.id, userId } },
    create: { brandId: brand.id, userId, roleId: adminRole.id },
    update: { roleId: adminRole.id },
  });

  console.info('');
  console.info('═══════════════════════════════════════');
  console.info('  Dev superuser ready');
  console.info('  Email:           ' + DEFAULT_EMAIL);
  if (AUTH_DRIVER !== 'dev') console.info('  Password:        ' + DEFAULT_PASSWORD);
  console.info('  Platform admin:  yes');
  console.info('  Brand:           ' + brand.name + '  (id: ' + brand.id + ')');
  console.info('  Brand role:      admin');
  console.info('  Mode:            ' + (AUTH_DRIVER === 'dev' ? 'local (no Supabase)' : 'Supabase Auth'));
  console.info('═══════════════════════════════════════');

  await prisma.$disconnect();
}

function deterministicUuid(seed: string): string {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
