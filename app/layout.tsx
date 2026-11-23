import type { Metadata } from 'next';
import './globals.css';
import { MotionProvider } from '@/src/components/MotionProvider';
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
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400..700&text=%E0%A7%A6%E0%A7%A7%E0%A7%A8%E0%A7%A9%E0%A7%AA%E0%A7%AB%E0%A7%AC%E0%A7%AD%E0%A7%AE%E0%A7%AF&display=swap"
        />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="preconnect" href="https://cdn.10minuteschool.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.10minuteschool.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var clean=function(root){if(!root||!root.querySelectorAll)return;if(root.hasAttribute&&root.hasAttribute('fdprocessedid'))root.removeAttribute('fdprocessedid');var els=root.querySelectorAll('[fdprocessedid]');for(var i=0;i<els.length;i++)els[i].removeAttribute('fdprocessedid');};window.__cleanFdAttrs=function(){clean(document.documentElement);};clean(document);if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){clean(document.documentElement);},{once:true});}var obs=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var m=muts[i];if(m.type==='attributes'){var t=m.target;if(t&&t.removeAttribute&&t.hasAttribute&&t.hasAttribute('fdprocessedid'))t.removeAttribute('fdprocessedid');}else if(m.addedNodes&&m.addedNodes.length){for(var j=0;j<m.addedNodes.length;j++)clean(m.addedNodes[j]);}}});obs.observe(document.documentElement,{attributes:true,attributeFilter:['fdprocessedid'],childList:true,subtree:true});var stop=function(){try{clean(document.documentElement);obs.disconnect();}catch(e){}};window.__stopFdAttrGuard=stop;setTimeout(stop,60000);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen selection:bg-red-500 selection:text-white"
      >
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
