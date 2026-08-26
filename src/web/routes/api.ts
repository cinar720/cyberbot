import { Router, Request, Response } from 'express';
import { asyncHandler } from '../controllers/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'CyberBOT API is running',
      version: process.env.BOT_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }),
);

router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }),
);

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    });
  }),
);

export default router;
