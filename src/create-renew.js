

export default function() {
  return async function renew(token) {
    const data = await this.validateToken(token, true);
    return this.generateToken(data, data.session);
  };
}
