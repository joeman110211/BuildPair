export function optimizedImageUrl(url: string, width = 1200) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (url.includes('/f_auto/q_auto/')) return url;

  const safeWidth = Math.max(64, Math.min(Math.round(width), 2400));
  return url.replace(
    '/image/upload/',
    `/image/upload/c_limit,w_${safeWidth}/f_auto/q_auto/`,
  );
}
