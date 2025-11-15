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
  title: "Heart Stamp - 일기를 쓰면 선생님이 칭찬 도장을 찍어주는 다이어리 앱",
  description: "일기장에 당신의 하루를 기록하면, AI 선생님이 따뜻한 코멘트와 함께 칭찬 도장을 찍어드려요. 감정 분석과 주간 리포트로 나를 더 잘 이해할 수 있습니다.",
  keywords: ["일기", "일기장", "다이어리", "감정 일기", "AI 일기", "감정 분석", "심리", "멘탈 헬스", "칭찬도장", "도장", "감성 일기"],
  openGraph: {
    title: "Heart Stamp",
    description: "일기를 쓰면 선생님이 칭찬 도장을 찍어주는 다이어리 앱",
    type: "website",
    url: 'https://heartstamp.kr',
    siteName: 'Heart Stamp',
    locale: 'ko_KR',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Heart Stamp - 감정 일기 앱',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heart Stamp',
    description: '일기를 쓰면 선생님이 칭찬 도장을 찍어주는 다이어리 앱',
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
