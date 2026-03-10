'use client';

import { useEffect, useRef } from 'react';

interface AdSlotProps {
  /** AdSense ad unit slot ID (from your AdSense account) */
  slot: string;
  /** Ad format. 'auto' = responsive, 'rectangle' = 300x250, 'banner' = 728x90 */
  format?: 'auto' | 'rectangle' | 'banner';
  className?: string;
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * Google AdSense slot component.
 * - Renders nothing if NEXT_PUBLIC_ADSENSE_CLIENT is not configured.
 * - Shows a placeholder box in development.
 * - Renders the actual ad unit in production.
 */
export default function AdSlot({ slot, format = 'auto', className = '' }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT || initialized.current) return;
    initialized.current = true;
    try {
      // Push ad after mount
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      // Silently fail in dev / ad blockers
    }
  }, []);

  // Not configured — render nothing
  if (!ADSENSE_CLIENT) {
    if (process.env.NODE_ENV === 'development') {
      const dims =
        format === 'rectangle' ? 'h-[250px] w-[300px]' :
        format === 'banner' ? 'h-[90px] w-full max-w-[728px]' :
        'h-[90px] w-full';
      return (
        <div className={`flex items-center justify-center bg-zinc-900/50 border border-dashed border-zinc-700 rounded-lg text-zinc-400 text-xs font-mono ${dims} ${className}`}>
          [AD · {format}]
        </div>
      );
    }
    return null;
  }

  const adStyle: React.CSSProperties =
    format === 'rectangle' ? { display: 'inline-block', width: '300px', height: '250px' } :
    format === 'banner' ? { display: 'block', width: '100%', maxWidth: '728px', height: '90px' } :
    { display: 'block' };

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={adStyle}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'auto' : undefined}
        data-full-width-responsive={format === 'auto' ? 'true' : undefined}
      />
    </div>
  );
}
