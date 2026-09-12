import { Children, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';

type CarouselProps = {
  children: ReactNode;
  label: string;
  variant?: 'featured' | 'steps' | 'tools' | 'trust' | 'plans' | 'trades';
  hint?: string;
};

/** Native horizontal scrolling, with page-sized controls and keyboard access. */
export function HomeCarousel({ children, label, variant = 'tools', hint }: CarouselProps) {
  const items = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState({ page: 0, pages: 1 });
  const measure = useCallback(() => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const pages = Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
    const page = Math.min(pages - 1, Math.round(el.scrollLeft / el.clientWidth));
    setPosition((prev) => prev.page === page && prev.pages === pages ? prev : { page, pages });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [measure, items.length]);

  function go(page: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(page, position.pages - 1)) * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  return <div className={`bp-carousel bp-carousel--${variant}`} role="region" aria-roledescription="carousel" aria-label={label}>
    <div id={id} ref={track} className="bp-track" tabIndex={0} onScroll={measure}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); go(position.page + (event.key === 'ArrowRight' ? 1 : -1));
        }
      }}>
      {items.map((item, index) => <div className="bp-slide" key={index} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${items.length}`}>{item}</div>)}
    </div>
    {position.pages > 1 ? <div className="bp-carousel-controls">
      <button className="bp-arrow" type="button" onClick={() => go(position.page - 1)} disabled={position.page === 0} aria-label={`Previous ${label.toLowerCase()}`} aria-controls={id}>←</button>
      <div className="bp-pagination">
        <span className="bp-swipe-hint">{hint ?? 'Swipe to explore'}</span>
        <div className="bp-dots">{Array.from({ length: position.pages }, (_, page) => <button key={page} className="bp-dot" type="button" aria-label={`${label}, page ${page + 1}`} aria-current={position.page === page ? 'true' : undefined} aria-controls={id} onClick={() => go(page)}><span /></button>)}</div>
        <span className="bp-sr-only" aria-live="polite">Page {position.page + 1} of {position.pages}</span>
      </div>
      <button className="bp-arrow" type="button" onClick={() => go(position.page + 1)} disabled={position.page === position.pages - 1} aria-label={`Next ${label.toLowerCase()}`} aria-controls={id}>→</button>
    </div> : null}
  </div>;
}
