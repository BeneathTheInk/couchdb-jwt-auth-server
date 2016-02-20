import crypto from 'crypto';

export default async function generateSession() {
  const sid = crypto.randomBytes(16).toString('hex');

  await this.sessionStore.add(sid);

  return sid;
}
