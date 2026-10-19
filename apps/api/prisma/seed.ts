import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/auth/security';

async function main() {
  const tenantName = process.env.BOOTSTRAP_TENANT_NAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME ?? 'Workspace Admin';
  if (!tenantName || !email || !password) throw new Error('Set BOOTSTRAP_TENANT_NAME, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for initial bootstrap');
  if (password.length < 12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters');
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findFirst({ where: { email, role: { in: [UserRole.OWNER, UserRole.ADMIN] } } });
    if (existing) throw new Error('An owner/admin with this email already exists; bootstrap refused');
    const tenant = await prisma.tenant.create({ data: { name: tenantName } });
    const passwordHash = await hashPassword(password);
    await prisma.user.create({ data: { tenantId: tenant.id, email, displayName, passwordHash, role: UserRole.OWNER } });
    process.stdout.write(`Created initial workspace ${tenant.id} and owner ${email}\n`);
  } finally { await prisma.$disconnect(); }
}
void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : 'Bootstrap failed'}\n`); process.exitCode = 1; });
