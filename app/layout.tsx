import type { Metadata } from 'next';
import './globals.css';

const siteUrl = (process.env.APP_URL || 'https://10msallcourse.com').replace(/\/+$/, '');

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
        <link rel="preconnect" href="https://cdn.10minuteschool.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.10minuteschool.com" />
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
