class EmptyStore {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      console.warn(`Please don't use the empty session store in a production environment since it is very insecure.`);
    }
  }

  add() {}
  exists() { return true; }
  remove() {}
}

export default function createEmptyStore() {
  return new EmptyStore();
}
