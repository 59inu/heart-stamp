import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://heartstamp.kr'),
  title: "HeartStamp – 칭찬 도장과 응원이 돌아오는 일기장",
  description: "한 줄만 적어도 작은 도장과 응원이 돌아오는 일기장. 어른의 하루에도 다정한 기록이 필요하니까.",
  keywords: ["일기", "일기장", "다이어리", "감정 일기", "칭찬 도장", "응원", "위로", "감성 일기", "마음 기록", "멘탈 헬스", "심리 건강", "하루 기록"],
  openGraph: {
    title: "HeartStamp – 칭찬 도장과 응원이 돌아오는 일기장",
    description: "한 줄만 적어도 작은 도장과 응원이 돌아오는 일기장. 어른의 하루에도 다정한 기록이 필요하니까.",
    type: "website",
    url: 'https://heartstamp.kr',
    siteName: 'HeartStamp',
    locale: 'ko_KR',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HeartStamp - 칭찬 도장과 응원이 돌아오는 일기장',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HeartStamp – 칭찬 도장과 응원이 돌아오는 일기장',
    description: '한 줄만 적어도 작은 도장과 응원이 돌아오는 일기장. 어른의 하루에도 다정한 기록이 필요하니까.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://heartstamp.kr',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <GoogleAnalytics gaId="G-ZDX0B1R9SK" />
      </body>
    </html>
  );
}
