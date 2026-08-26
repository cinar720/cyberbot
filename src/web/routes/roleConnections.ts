import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/metadata', (_request: Request, response: Response) => {
  response.json([
    {
      type: 2,
      key: 'premium',
      name: 'Premium üyelik',
      description: 'CyberBOT Premium üyeliği',
    },
  ]);
});

export default router;