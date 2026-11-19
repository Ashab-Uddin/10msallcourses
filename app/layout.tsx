import type { Metadata } from 'next';
import './globals.css';
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_NAME,
  DEFAULT_SITE_TITLE,
  getSiteBaseUrl,
} from '@/src/lib/seo';

const siteUrl = getSiteBaseUrl();
const ogImageUrl = `${siteUrl}${DEFAULT_OG_IMAGE_PATH}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: DEFAULT_SITE_TITLE,
  description: DEFAULT_SITE_DESCRIPTION,
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    url: siteUrl,
    type: 'website',
    locale: 'bn_BD',
    siteName: DEFAULT_SITE_NAME,
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: `${DEFAULT_SITE_TITLE} — 10 Minute School Courses`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [
      {
        url: ogImageUrl,
        alt: `${DEFAULT_SITE_TITLE} — 10 Minute School Courses`,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
        />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="preconnect" href="https://cdn.10minuteschool.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.10minuteschool.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=function(r){if(!r||!r.querySelectorAll)return;var e=r.querySelectorAll('[fdprocessedid]');for(var i=0;i<e.length;i++)e[i].removeAttribute('fdprocessedid');};c(document);var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++){var t=m[i].target;if(t&&t.removeAttribute&&t.hasAttribute&&t.hasAttribute('fdprocessedid'))t.removeAttribute('fdprocessedid');}});o.observe(document.documentElement,{attributes:true,attributeFilter:['fdprocessedid'],subtree:true});var s=function(){try{o.disconnect()}catch(e){}};window.__stopFdAttrGuard=s;setTimeout(s,5000);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen selection:bg-red-500 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
