import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '10 Minute School Course Marketplace - ১০ মিনিট স্কুল কোর্স',
  description: '১০ মিনিট স্কুলের সকল কোর্সে সরাসরি সর্বোচ্চ প্রাথমিক ছাড়ে ভর্তি নিশ্চিত করার জন্য ডেডিকেটেড অ্যাফিলিয়েট প্ল্যাটফর্ম।',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    title: '10 Minute School Course Marketplace - ১০ মিনিট স্কুল কোর্স',
    description: '১০ মিনিট স্কুলের সকল কোর্সে সরাসরি সর্বোচ্চ প্রাথমিক ছাড়ে ভর্তি নিশ্চিত করার জন্য ডেডিকেটেড অ্যাফিলিয়েট প্ল্যাটফর্ম।',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '10 Minute School Course Marketplace - ১০ মিনিট স্কুল কোর্স',
    description: '১০ মিনিট স্কুলের সকল কোর্সে সরাসরি সর্বোচ্চ প্রাথমিক ছাড়ে ভর্তি নিশ্চিত করার জন্য ডেডিকেটেড অ্যাফিলিয়েট প্ল্যাটফর্ম।',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.10minuteschool.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.10minuteschool.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Material+Symbols+Outlined:FILL,wght@0..1,100..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen selection:bg-red-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
