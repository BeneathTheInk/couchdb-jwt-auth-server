

export default function() {
  return async function logout(token) {
    const data = await this.validateToken(token, true);
    await this.sessionStore.remove(data.session);
    return data;
  };
}
