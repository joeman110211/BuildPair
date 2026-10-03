import { Platform } from 'react-native';

export function scrollToResults(elementId: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const scroll = () => {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(scroll));
    return;
  }

  setTimeout(scroll, 0);
}
