import type { Metadata } from 'next';
import { Hind_Siliguri, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  display: 'swap',
  variable: '--font-hind-siliguri',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

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
    <html lang="bn" className={`${hindSiliguri.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.10minuteschool.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.10minuteschool.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,wght@0..1,100..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className={`${hindSiliguri.className} antialiased min-h-screen selection:bg-red-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
