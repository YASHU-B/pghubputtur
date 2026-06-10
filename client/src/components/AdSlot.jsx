import { useEffect, useState, useRef } from 'react';

/**
 * Reusable Google AdSense Component
 * @param {string} slot - The Ad slot ID provided by Google AdSense dashboard.
 * @param {string} format - The format of the ad (e.g., 'auto', 'fluid', 'rectangle').
 * @param {boolean} responsive - Whether the ad is responsive.
 * @param {string} className - Additional CSS classes.
 */
export default function AdSlot({ slot, format = 'auto', responsive = 'true', className = '' }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn('AdSense push error:', err);
        setIsBlocked(true);
      }
    };

    // Dynamically insert the Google AdSense script tag to prevent loading on non-ad pages (violations)
    const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7624075828918805';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        initAd();
      };
      script.onerror = () => {
        console.warn('AdSense script failed to load.');
        setIsBlocked(true);
      };
      document.head.appendChild(script);
    } else {
      initAd();
    }
  }, []);

  if (isBlocked) {
    return null;
  }

  return (
    <div className={`my-8 mx-auto w-full max-w-4xl p-4 bg-gray-50/60 backdrop-blur-md rounded-2xl border border-gray-100/80 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-orange-50/50 ${className}`}>
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase">
          Sponsored Link
        </span>
        <span className="text-[9px] text-gray-300 font-medium">
          Ad
        </span>
      </div>

      <div className="w-full flex justify-center items-center min-h-[90px] relative">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '90px' }}
          data-ad-client="ca-pub-7624075828918805"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive}
        />
      </div>
    </div>
  );
}
