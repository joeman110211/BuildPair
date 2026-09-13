export const tokenCache = {
  async getToken(key: string) {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch {
      // Clerk can continue with its in-memory session if browser storage is unavailable.
    }
  },
};
