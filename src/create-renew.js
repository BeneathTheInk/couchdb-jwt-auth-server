

export default function createRenew() {
  return async function renew(token) {
    const data = await this.validateToken(token, true);
    data.roles = await this.refreshRoles(data);
    return this.generateToken(data, data.session);
  };
}
