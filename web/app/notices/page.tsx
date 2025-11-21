'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NoticesContent() {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get('embedded') === 'true';

  return (
    <div className="min-h-screen bg-white">
      {/* Header - 웹뷰에서는 숨김 */}
      {!isEmbedded && (
        <header className="border-b border-gray-100">
          <div className="container mx-auto px-6 py-4">
            <Link href="/" className="text-[#87A6D1] hover:text-[#6B8AB8] transition-colors">
              ← 홈으로
            </Link>
          </div>
        </header>
      )}

      {/* Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-light text-[#2F2B4C] mb-8">공지사항</h1>

        <div className="text-[#2F2B4C]/80 leading-relaxed space-y-8">
          {/* 1.1.0 업데이트 안내 (최신 공지) */}
          <section className="bg-gradient-to-br from-[#F0F6FF] to-white rounded-xl p-8 border-l-4 border-[#87A6D1] relative">
            {/* NEW 뱃지 */}
            <div className="absolute top-6 right-6">
              <span className="bg-[#87A6D1] text-white text-xs font-bold px-3 py-1 rounded-full">
                NEW
              </span>
            </div>

            <p className="text-sm text-[#2F2B4C]/60 mb-2">2025.11.21</p>
            <h2 className="text-2xl font-semibold text-[#2F2B4C] mb-6">
              📌 What's New — Version 1.1.0
            </h2>

            <div className="space-y-5">
              <div>
                <p className="font-medium text-[#2F2B4C] mb-1">
                  ✏️ 크레용으로 그려주는 그림 일기 기능이 생겼어요
                </p>
                <p className="text-sm text-[#2F2B4C]/70 ml-6">일기 속 순간을 그림으로 다시 만나보세요!</p>
                <p className="text-xs text-[#2F2B4C]/50 ml-6 mt-1">
                  ※ 일기 원문 전체가 아닌, 한 장면만 추출되어 그림이 생성되며, 개인정보 보호를 위해 추상적으로 표현됩니다
                </p>
              </div>

              <div>
                <p className="font-medium text-[#2F2B4C] mb-1">
                  🖼️ 마음에 드는 일기를 이미지로 저장하거나 공유할 수 있어요
                </p>
                <p className="text-sm text-[#2F2B4C]/70 ml-6">나만의 기록을 예쁘게 간직하세요</p>
              </div>

              <div>
                <p className="font-medium text-[#2F2B4C] mb-1">🌈 1년 감정 로그를 색으로 확인해보세요</p>
                <p className="text-sm text-[#2F2B4C]/70 ml-6">올 한 해의 마음을 한 눈에!</p>
              </div>

              <div>
                <p className="font-medium text-[#2F2B4C] mb-1">💌 선생님 편지가 도착할지도 몰라요</p>
                <p className="text-sm text-[#2F2B4C]/70 ml-6">
                  일기를 꾸준히 쓰는 당신께 작은 선물처럼
                </p>
              </div>

              <div>
                <p className="font-medium text-[#2F2B4C] mb-1">
                  🔧 그 외 버그 수정 및 안정화가 함께 진행되었어요
                </p>
              </div>
            </div>
          </section>

          {/* 1.0.0 출시 안내 */}
          <section className="bg-gray-50 rounded-xl p-8">
            <p className="text-sm text-[#2F2B4C]/60 mb-2">2025.11.17</p>
            <h2 className="text-xl font-semibold text-[#2F2B4C] mb-4">Heart Stamp 출시 안내</h2>

            <p className="mb-4">
              안녕하세요, Heart Stamp 팀입니다.
              <br />
              <br />
              일기를 쓰면 선생님이 도장을 찍어주는 감성 다이어리 앱, Heart Stamp를 찾아주셔서
              감사합니다!
            </p>

            <h3 className="font-semibold text-[#2F2B4C] mb-2">주요 기능:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>하루 한 번, 일기 작성</li>
              <li>기분에 따른 감정 메시지</li>
              <li>AI 선생님의 따뜻한 코멘트와 도장</li>
              <li>주간/월간 감정 리포트</li>
            </ul>

            <p>
              여러분의 하루를 소중히 기록하고, 선생님의 격려를 받아보세요.
              <br />
              감사합니다.
            </p>
          </section>

          {/* 서비스 이용 안내 */}
          <section className="bg-gray-50 rounded-xl p-8">
            <p className="text-sm text-[#2F2B4C]/60 mb-2">2025.11.17</p>
            <h2 className="text-xl font-semibold text-[#2F2B4C] mb-4">서비스 이용 안내</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-[#2F2B4C] mb-2">일기 작성</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>하루에 한 번, 언제든지 작성 가능합니다</li>
                  <li>오늘 날짜의 일기만 선생님의 코멘트를 받을 수 있습니다</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-[#2F2B4C] mb-2">AI 코멘트</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>매일 새벽 3시에 전날 일기에 코멘트가 달립니다</li>
                  <li>오전 8시 30분에 푸시 알림으로 알려드립니다</li>
                  <li>일기를 작성한 다음 날 아침에 확인하실 수 있습니다</li>
                  <li>Anthropic Claude API를 사용하여 따뜻하고 섬세한 코멘트를 생성합니다</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-[#2F2B4C] mb-2">개인정보 보호</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>일기 원문은 암호화되어 저장됩니다</li>
                  <li>AI 코멘트 생성을 위해 Anthropic Claude API로 일기가 전송됩니다</li>
                  <li>
                    전송된 데이터는 AI 학습에 사용되지 않으며, Trust & Safety 목적으로 최대 90일
                    보관 후 자동 삭제됩니다
                  </li>
                  <li>
                    자세한 내용은 설정 {'>'} 개인정보 처리방침을 확인해주세요
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-[#2F2B4C] mb-2">문의사항</h3>
                <p className="text-sm ml-4">
                  설정 {'>'} FAQ / 문의하기에서 언제든지 문의 주세요!
                </p>
              </div>
            </div>
          </section>

          {/* 문의 안내 */}
          <section className="pt-8 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-center text-[#2F2B4C]/70">
                공지사항과 관련하여 문의사항이 있으시면
                <br />
                <a
                  href="mailto:heartstampdiary@gmail.com"
                  className="text-[#87A6D1] underline hover:text-[#6B8AB8] transition-colors"
                >
                  heartstampdiary@gmail.com
                </a>
                으로 연락해주세요.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2F2B4C] text-white/60 py-12 mt-20">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs">© 2025 Heart Stamp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function NoticesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NoticesContent />
    </Suspense>
  );
}
