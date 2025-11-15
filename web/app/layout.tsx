import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Heart Stamp - 일기를 쓰면 선생님이 도장을 찍어주는 감성 다이어리",
  description: "매일 밤 당신의 하루를 기록하면, AI 선생님이 따뜻한 코멘트와 함께 도장을 찍어드려요. 감정 분석과 주간 리포트로 나를 더 잘 이해할 수 있습니다.",
  keywords: ["일기", "다이어리", "감정 일기", "AI 일기", "감정 분석", "심리", "멘탈 헬스"],
  openGraph: {
    title: "Heart Stamp",
    description: "일기를 쓰면 선생님이 도장을 찍어주는 감성 다이어리",
    type: "website",
    images: ['/icon.png'],
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
      </body>
    </html>
  );
}
