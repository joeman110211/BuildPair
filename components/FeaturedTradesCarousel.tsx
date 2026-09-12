import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { HomeCarousel } from '@/components/HomeCarousel';
import { HomeIcon } from '@/components/HomeVisuals';

type FeaturedTrade = {
  id: string;
  businessName: string;
  tradeCategory: string;
  locationLabel: string | null;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  galleryCount: number;
};
type FeaturedResponse = { trader: FeaturedTrade | null; traders?: FeaturedTrade[] };

function FeaturedCard({ trader, index }: { trader: FeaturedTrade; index: number }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto = Boolean(trader.photos?.[0]) && !photoFailed;
  return <article className="bp-trade-profile" data-testid="home-featured-trader">
    <a href={`/traders/${encodeURIComponent(trader.id)}`} className={`bp-profile-photo ${!hasPhoto ? 'bp-profile-photo--empty' : ''}`} aria-label={`View ${trader.businessName} profile`}>
      {hasPhoto ? <img src={trader.photos[0]} alt={`${trader.businessName} work example`} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" onError={() => setPhotoFailed(true)} />
        : <div className="bp-business-monogram"><span>{trader.businessName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</span><small>Work photos coming soon</small></div>}
      <span className="bp-featured-label"><HomeIcon name="star" size={13} /> Featured</span>
      {hasPhoto && trader.galleryCount > 1 ? <span className="bp-gallery-count">{trader.galleryCount} photos</span> : null}
    </a>
    <div className="bp-profile-copy">
      <h3>{trader.businessName}</h3>
      <p className="bp-profile-category">{trader.tradeCategory}</p>
      <p className="bp-profile-location"><HomeIcon name="pin" size={15} />{trader.locationLabel || 'View service area'}</p>
      <p className="bp-profile-review">{trader.reviewCount > 0 ? <><HomeIcon name="star" size={14} /><strong>{Number(trader.averageRating).toFixed(1)}</strong> <span>({trader.reviewCount} verified)</span></> : 'New to BuildPair'}</p>
      <a className="bp-button bp-button--outline bp-profile-button" href={`/traders/${encodeURIComponent(trader.id)}`}>View profile <span aria-hidden="true">↗</span></a>
    </div>
  </article>;
}

export function FeaturedTradesCarousel() {
  const [traders, setTraders] = useState<FeaturedTrade[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    apiFetch<FeaturedResponse>('/api/featured-trader')
      .then((data) => {
        if (!active) return;
        const candidates = data.traders ?? (data.trader ? [data.trader] : []);
        setTraders(candidates.filter((item, index) => candidates.findIndex(other => other.id === item.id) === index).slice(0, 6));
        setStatus('ready');
      }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [attempt]);

  return <section className="bp-featured bp-container" aria-labelledby="bp-featured-title">
    <div className="bp-featured-heading"><div><span className="bp-eyebrow">Meet the people behind the work</span><h2 id="bp-featured-title">Featured tradespeople</h2></div><a className="bp-text-link" href="/directory">Browse all <span aria-hidden="true">↗</span></a></div>
    {status === 'loading' ? <div className="bp-featured-loading" role="status" aria-label="Loading featured tradespeople">{[0, 1].map(item => <div key={item} className="bp-profile-skeleton"><div /><span /><span /></div>)}</div>
      : traders.length ? <HomeCarousel label="Featured tradespeople" variant="featured" hint="Swipe for more trades">{traders.map((trader, index) => <FeaturedCard key={trader.id} trader={trader} index={index} />)}</HomeCarousel>
      : <div className="bp-empty-state"><HomeIcon name="tools" size={32} /><p>{status === 'error' ? 'Featured profiles are taking a little longer to load.' : 'More trade profiles are on their way.'}</p>{status === 'error' ? <button type="button" className="bp-button bp-button--outline" onClick={() => { setStatus('loading'); setAttempt(value => value + 1); }}>Try again</button> : null}<a href="/directory" className="bp-text-link">Explore the trade directory →</a></div>}
  </section>;
}
