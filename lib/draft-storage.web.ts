const webPrefix = 'buildpair:draft:';

function storage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export async function saveDraft<T>(key: string, value: T) {
  try {
    storage()?.setItem(`${webPrefix}${key}`, JSON.stringify(value));
  } catch {
    // Draft persistence is best-effort and must never block profile editing.
  }
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  try {
    const serialized = storage()?.getItem(`${webPrefix}${key}`);
    return serialized ? JSON.parse(serialized) as T : null;
  } catch {
    return null;
  }
}

export async function clearDraft(key: string) {
  try {
    storage()?.removeItem(`${webPrefix}${key}`);
  } catch {
    // Clearing a local draft must never block loading an existing profile.
  }
}
