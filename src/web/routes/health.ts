import { Router, type Request, type Response } from 'express';
import { getPrisma } from '../../services/database/index.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  let dbStatus = 'ONLINE';
  const prisma = getPrisma();
  prisma.$queryRaw`SELECT 1`.catch(() => {
    dbStatus = 'OFFLINE';
  });

  res.json({
    success: true,
    data: {
      discord: 'ONLINE',
      database: dbStatus,
      bot: 'ONLINE',
      web: 'ONLINE',
    },
  });
});

export default router;
