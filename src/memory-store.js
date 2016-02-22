class MemoryStore {
  constructor() {
    this.sessions = {};

    if (process.env.NODE_ENV !== 'development') {
      console.warn(
`Please don't use the memory session store outside of local development.
It does not scale and sessions are not preserved when the app is restarted.`
      );
    }
  }

  add(sid) {
    this.sessions[sid] = true;
  }

  exists(sid) {
    return !!this.sessions[sid];
  }

  remove(sid) {
    delete this.sessions[sid];
  }
}

export default function createMemoryStore() {
  return new MemoryStore();
}
