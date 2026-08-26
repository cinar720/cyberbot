import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
try {
  await p.$connect();
  console.log('CONNECTED');
  const result = await p.$queryRaw`SELECT 1 as test`;
  console.log('QUERY OK:', result);
} catch (e) {
  console.error('FAILED:', e.message);
} finally {
  await p.$disconnect();
}
