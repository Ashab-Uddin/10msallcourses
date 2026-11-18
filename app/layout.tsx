import type { Metadata } from 'next';
import './globals.css';
import { getSiteBaseUrl } from '@/src/lib/seo';

const siteUrl = getSiteBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '১০ মিনিট স্কুল কোর্স — 10 Minute School Course Marketplace',
  description:
    '১০ মিনিট স্কুলের সকল একাডেমিক, এডমিশন ও স্কিলস কোর্সে সরাসরি সর্বোচ্চ ছাড়ে ভর্তি নিশ্চিত করার জন্য ডেডিকেটেড অ্যাফিলিয়েট প্ল্যাটফর্ম।',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    title: '১০ মিনিট স্কুল কোর্স — 10 Minute School Course Marketplace',
    description:
      '১০ মিনিট স্কুলের সকল একাডেমিক, এডমিশন ও স্কিলস কোর্সে সরাসরি সর্বোচ্চ ছাড়ে ভর্তি নিশ্চিত করার জন্য ডেডিকেটেড অ্যাফিলিয়েট প্ল্যাটফর্ম।',
    type: 'website',
    locale: 'bn_BD',
    siteName: '10msallcourse.com',
    images: [
      {
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: '১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '১০ মিনিট স্কুল কোর্স — 10 Minute School Course Marketplace',
    description:
      '১০ মিনিট স্কুলের সকল একাডেমিক, এডমিশন ও স্কিলস কোর্সে সরাসরি সর্বোচ্চ ছাড়ে ভর্তি নিশ্চিত করার জন্য ডেডিকেটেড অ্যাফিলিয়েট প্ল্যাটফর্ম।',
    images: ['/images/logo.png'],
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
