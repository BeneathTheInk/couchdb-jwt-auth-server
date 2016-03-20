

export default function createLogin() {
  return async function login(username, password) {
    const response = await this.authenticate(username, password);
    const session = await this.generateSession();
    return this.generateToken(response.userCtx, session);
  };
}
