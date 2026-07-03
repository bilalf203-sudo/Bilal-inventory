import { PrismaClient } from '@prisma/client';
import {
  PERMISSION_LIST,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from '@bilal/shared';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.info('Seeding permissions...');
  for (const name of PERMISSION_LIST) {
    await prisma.permission.upsert({
      where: { name },
      create: { name, description: `Permission: ${name}` },
      update: {},
    });
  }
}

async function seedRoles() {
  console.info('Seeding roles...');
  for (const [name, description] of Object.entries(ROLE_DESCRIPTIONS)) {
    await prisma.role.upsert({
      where: { name },
      create: { name, description },
      update: { description },
    });
  }
}

async function seedRolePermissions() {
  console.info('Seeding role-permission mappings...');
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS) as [
    string,
    Permission[],
  ][]) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permName of permissions) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { name: permName } });
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedRolePermissions();

  console.info('Seed complete (permissions + roles + role-permissions).');
  console.info('');
  console.info('Next:');
  console.info('  pnpm --filter @bilal/api db:dev-superuser');
  console.info('  → creates a default brand + platform-admin (admin@dev.local)');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
