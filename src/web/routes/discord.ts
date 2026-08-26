import { verify } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { getLinkedRolesOAuthUrl, updateRoleConnection, verifyLinkedRolesState } from '../auth/oauth2.js';

const router = Router();
const interactionPublicKeyPrefix = Buffer.from('302a300506032b6570032100', 'hex');

function getPublicKey(): Buffer | null {
  const value = process.env.DISCORD_PUBLIC_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) return null;
  return Buffer.concat([interactionPublicKeyPrefix, Buffer.from(value, 'hex')]);
}

function isValidInteractionRequest(request: Request): boolean {
  const publicKey = getPublicKey();
  const signature = request.header('X-Signature-Ed25519');
  const timestamp = request.header('X-Signature-Timestamp');
  const body = Buffer.isBuffer(request.body) ? request.body : null;
  if (!publicKey || !signature || !timestamp || !body || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const timestampValue = Number(timestamp);
  if (!/^\d+$/.test(timestamp) || !Number.isSafeInteger(timestampValue) || Math.abs(Date.now() - timestampValue) > 5 * 60 * 1000) return false;

  try {
    return verify(
      null,
      Buffer.concat([Buffer.from(timestamp), body]),
      { key: publicKey, format: 'der', type: 'spki' },
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

router.post('/interactions', (request: Request, response: Response) => {
  if (!isValidInteractionRequest(request)) {
    response.status(401).json({ error: 'Geçersiz Discord imzası.' });
    return;
  }

  const payload = JSON.parse((request.body as Buffer).toString('utf8')) as { type?: number };
  if (payload.type === 1) {
    response.json({ type: 1 });
    return;
  }

  response.status(501).json({ error: 'HTTP interaction işleyicisi henüz etkin değil.' });
});

router.get('/linked-roles/verify', (_request: Request, response: Response) => {
  response.redirect(getLinkedRolesOAuthUrl());
});

router.get('/linked-roles/callback', async (request: Request, response: Response) => {
  const code = typeof request.query.code === 'string' ? request.query.code : '';
  const state = typeof request.query.state === 'string' ? request.query.state : '';
  if (!code || !verifyLinkedRolesState(state)) {
    response.status(400).send('Discord doğrulama kodu eksik.');
    return;
  }

  try {
    await updateRoleConnection(code);
    response.send('Bağlı Roller doğrulaması tamamlandı. Discord’a dönerek rol şartlarını yenileyebilirsiniz.');
  } catch {
    response.status(400).send('Bağlı Roller doğrulaması tamamlanamadı.');
  }
});

export { interactionPublicKeyPrefix };
export default router;