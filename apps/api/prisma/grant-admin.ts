/**
 * Make a user platform admin (can create brands and access all of them).
 *
 *   pnpm --filter @bilal/api exec tsx prisma/grant-admin.ts <email>
 *
 * For brand-level admin, use the in-app Members UI instead, or run a DB query
 * directly against brand_members.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx prisma/grant-admin.ts <user-email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email "${email}". Sign them up in Supabase Auth first.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isPlatformAdmin: true },
  });

  console.info(`Granted platform admin to ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
