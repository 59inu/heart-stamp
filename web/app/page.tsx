import Image from "next/image";
import ScreenshotCarousel from "@/components/ScreenshotCarousel";
import DownloadButton from "@/components/DownloadButton";

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Heart Stamp',
    description: '일기를 쓰면 선생님이 칭찬 도장을 찍어주는 다이어리 앱',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'iOS',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '1',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero Section - 여백 많고 간결하게 */}
      <section className="container mx-auto px-6 py-32 md:py-40 text-center">
        <div className="flex justify-center mb-12">
          <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg">
            <Image
              src="/icon.png"
              alt="Heart Stamp Icon"
              width={80}
              height={80}
              priority
            />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-light text-[#2F2B4C] mb-20 tracking-wide">
          당신의 하루,<br/> 마음으로 기록해보세요
        </h1>

        <DownloadButton />
      </section>

      {/* 앱 설명 - 감성적 표현 */}
      <section className="bg-gradient-to-b from-[#F7F6F9] to-white py-20">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <p className="text-xl md:text-2xl text-[#2F2B4C]/80 leading-relaxed font-light mb-8">
            하루의 마음을 기록하면,<br className="md:hidden" />
            선생님이 당신의 감정을 읽어드립니다
          </p>
          <p className="text-base text-[#2F2B4C]/60 leading-relaxed">
            Heart Stamp는 일기장에 하루의 감정을 기록하면,<br className="md:hidden" />
            AI 선생님이 칭찬 도장을 찍어주는 다이어리 앱이에요
          </p>
        </div>
      </section>

      {/* 주요 기능 3가지 - 아이콘+짧은 설명 */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {/* Feature 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#E8F5EE] rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-[#9DD2B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#2F2B4C] mb-2">
              하루 감정 기록
            </h3>
            <p className="text-[#2F2B4C]/60 text-sm leading-relaxed">
              오늘 느낀 감정을<br />자유롭게 적어보세요
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#FADADD] rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-[#F19392]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#2F2B4C] mb-2">
              칭찬 도장과 따뜻한 코멘트
            </h3>
            <p className="text-[#2F2B4C]/60 text-sm leading-relaxed">
              다음 날, 선생님의<br />한마디를 받아보세요
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#FAF8F3] rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-[#F5EFE5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#2F2B4C] mb-2">
              주간 감정 리포트
            </h3>
            <p className="text-[#2F2B4C]/60 text-sm leading-relaxed">
              일주일의 마음을<br />되돌아볼 수 있어요
            </p>
          </div>
        </div>
      </section>

      {/* 스크린샷 캐로셀 */}
      <section className="bg-gradient-to-b from-white to-[#F7F6F9] py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <ScreenshotCarousel
              screenshots={[
                { src: "/screenshot1.png", alt: "Heart Stamp 일기 작성 화면" },
                { src: "/screenshot2.png", alt: "Heart Stamp 선생님 코멘트" },
                { src: "/screenshot3.png", alt: "Heart Stamp 주간 리포트" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 감정 리포트 예시 */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 border border-[#F7F6F9]">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-light text-[#2F2B4C] mb-3">
                주간 리포트
              </h3>
              <p className="text-[#2F2B4C]/60 text-sm">
                2025년 1월 1주차
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#E8F5EE] rounded-full flex items-center justify-center">
                  <span className="text-2xl">😊</span>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-[#E8F5EE] rounded-full overflow-hidden">
                    <div className="h-full bg-[#9DD2B6]" style={{width: '65%'}}></div>
                  </div>
                </div>
                <span className="text-sm text-[#2F2B4C]/60 flex-shrink-0">65%</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FAF8F3] rounded-full flex items-center justify-center">
                  <span className="text-2xl">😐</span>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-[#FAF8F3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F5EFE5]" style={{width: '25%'}}></div>
                  </div>
                </div>
                <span className="text-sm text-[#2F2B4C]/60 flex-shrink-0">25%</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#FADADD] rounded-full flex items-center justify-center">
                  <span className="text-2xl">😔</span>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-[#FADADD] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F19392]" style={{width: '10%'}}></div>
                  </div>
                </div>
                <span className="text-sm text-[#2F2B4C]/60 flex-shrink-0">10%</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[#F7F6F9]">
              <p className="text-[#2F2B4C]/70 text-center leading-relaxed">
                "성취감도 있었지만 에너지도 많이 쓴 한 주네요.<br />
                충분히 잘해내고 있어요."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 사용자 후기 */}
      <section className="bg-gradient-to-b from-[#F7F6F9] to-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-light text-center text-[#2F2B4C] mb-16">
            사용자 이야기
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-[#2F2B4C]/70 leading-relaxed mb-6">
                "AI가 위로하려 하지 않아서 좋았어요."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E8F5EE] rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-[#2F2B4C]">민지</p>
                  <p className="text-xs text-[#2F2B4C]/50">직장인</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-[#2F2B4C]/70 leading-relaxed mb-6">
                "감정을 정리할 수 있었어요."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FADADD] rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-[#2F2B4C]">서연</p>
                  <p className="text-xs text-[#2F2B4C]/50">대학생</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-[#2F2B4C]/70 leading-relaxed mb-6">
                "내 마음을 들여다볼 수 있게 됐어요."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FAF8F3] rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-[#2F2B4C]">지훈</p>
                  <p className="text-xs text-[#2F2B4C]/50">프리랜서</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="download" className="container mx-auto px-6 py-32 text-center">
        <h2 className="text-3xl md:text-4xl font-light text-[#2F2B4C] mb-6">
          응석 부릴 어른들을 위한 다이어리 앱
        </h2>
        <p className="text-lg text-[#2F2B4C]/60 mb-12">
          오늘부터 일기장에 마음을 기록해보세요
        </p>

        <DownloadButton size="large" />

        <p className="text-sm text-[#2F2B4C]/40 mt-8">
          iOS 14.0 이상
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-[#2F2B4C] text-white/60 py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="mb-6">
            <div className="inline-flex w-12 h-12 rounded-2xl overflow-hidden mb-3">
              <Image
                src="/icon.png"
                alt="Heart Stamp"
                width={48}
                height={48}
              />
            </div>
            <p className="text-sm">Heart Stamp</p>
          </div>

          {/* Policy Links */}
          <div className="flex justify-center gap-6 mb-6">
            <a
              href="/terms"
              className="text-xs hover:text-white transition-colors underline underline-offset-2"
            >
              서비스 이용약관
            </a>
            <a
              href="/privacy"
              className="text-xs hover:text-white transition-colors underline underline-offset-2"
            >
              개인정보 처리방침
            </a>
            <a
              href="mailto:heartstampdiary@gmail.com"
              className="text-xs hover:text-white transition-colors underline underline-offset-2"
            >
              문의하기
            </a>
          </div>

          <p className="text-xs">
            © 2025 Heart Stamp. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
