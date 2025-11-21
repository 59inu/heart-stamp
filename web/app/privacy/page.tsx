'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PrivacyContent() {
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
        <h1 className="text-3xl md:text-4xl font-light text-[#2F2B4C] mb-8">
          개인정보 처리방침
        </h1>

        <div className="text-[#2F2B4C]/80 leading-relaxed space-y-8">
          <section>
            <p className="text-sm text-[#2F2B4C]/60 mb-8">
              시행일: 2025년 11월 17일
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p>
                Heart Stamp(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 개인정보 보호법 등 관련 법령을 준수합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              1. 수집하는 개인정보 항목
            </h2>
            <p className="mb-3">서비스는 다음의 개인정보를 수집합니다:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>일기 내용 및 작성 날짜</li>
              <li>감정 정보 (기분, 감정 태그)</li>
              <li>날씨 정보</li>
              <li>사진 (선택사항)</li>
              <li>앱 내부 익명 사용자 ID (UUID - 앱 설치 시 자동 생성)</li>
              <li>기기 정보 (OS 버전, 앱 버전)</li>
              <li>푸시 알림 토큰 (알림 수신 동의 시)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              2. 개인정보의 수집 및 이용 목적
            </h2>
            <p className="mb-3">수집한 개인정보는 다음의 목적으로만 이용됩니다:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>일기 작성, 저장 및 조회 서비스 제공</li>
              <li>AI 기반 일기 코멘트 생성</li>
              <li>AI 기반 크레용 일러스트 생성 (그림일기 기능)</li>
              <li>감정 분석 및 주간/월간 리포트 제공</li>
              <li>감정 스탬프 컬렉션 및 통계 제공</li>
              <li>푸시 알림 발송</li>
              <li>서비스 개선 및 에러 추적</li>
              <li>고객 문의 응대</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              3. 개인정보의 제3자 제공
            </h2>
            <p className="mb-4">
              서비스는 AI 코멘트 생성을 위해 다음과 같이 개인정보를 제3자에게 제공합니다.
            </p>

            <div className="bg-[#F0F6FF] rounded-lg p-6 border-l-4 border-[#87A6D1] mb-4">
              <h3 className="text-lg font-semibold text-[#2F2B4C] mb-3">
                Anthropic PBC (Claude API)
              </h3>
              <ul className="space-y-1 text-sm">
                <li><strong>제공받는 자:</strong> Anthropic PBC (미국)</li>
                <li><strong>제공 목적:</strong> AI 기반 일기 코멘트 및 감정 분석</li>
                <li><strong>제공 항목:</strong> 일기 내용, 작성 날짜, 감정 정보</li>
                <li><strong>보유 및 이용기간:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Anthropic은 API를 통해 전송된 데이터를 모델 학습에 사용하지 않습니다</li>
                    <li>신뢰 및 안전(Trust & Safety) 목적으로 최대 30일 보관 후 자동 삭제됩니다</li>
                    <li>자세한 내용: <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[#87A6D1] underline">https://www.anthropic.com/legal/privacy</a></li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="bg-[#F0F6FF] rounded-lg p-6 border-l-4 border-[#87A6D1] mb-4">
              <h3 className="text-lg font-semibold text-[#2F2B4C] mb-3">
                나노바나나 (그림일기 AI)
              </h3>
              <ul className="space-y-1 text-sm">
                <li><strong>제공받는 자:</strong> 나노바나나 (대한민국)</li>
                <li><strong>제공 목적:</strong> 일기 기반 크레용 스타일 일러스트 생성</li>
                <li><strong>제공 항목:</strong> 일기에서 추출된 장면 설명 및 키워드</li>
                <li><strong>보유 및 이용기간:</strong> 이미지 생성 완료 즉시 자동 삭제</li>
                <li><strong>개인정보 보호:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>일기 원문 전체가 전송되지 않으며, 한 장면의 설명만 추출되어 전송됩니다</li>
                    <li>성별과 나이는 모호하게 표현되어 개인을 특정할 수 없습니다</li>
                    <li>이름, 장소명 등 개인 식별 정보는 제거되거나 일반화됩니다</li>
                    <li>생성된 이미지는 프라이버시 보호를 위해 추상적으로 표현됩니다</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="bg-[#F0F6FF] rounded-lg p-6 border-l-4 border-[#87A6D1]">
              <h3 className="text-lg font-semibold text-[#2F2B4C] mb-3">
                Sentry (에러 추적)
              </h3>
              <ul className="space-y-1 text-sm">
                <li><strong>제공받는 자:</strong> Functional Software, Inc. (미국)</li>
                <li><strong>제공 목적:</strong> 앱 오류 및 성능 모니터링</li>
                <li><strong>제공 항목:</strong> 에러 로그, 기기 정보, 앱 버전</li>
                <li><strong>보유 및 이용기간:</strong> 90일 보관 후 자동 삭제</li>
                <li><strong>개인정보 보호:</strong> 일기 내용, 사용자 식별 정보 등은 전송되지 않습니다</li>
              </ul>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500 mt-4">
              <p className="text-sm text-red-700">
                ※ 본 제3자 제공에 동의하지 않을 경우, Heart Stamp의 AI 코멘트 기능을 이용할 수 없습니다. AI 코멘트는 서비스의 핵심 기능이므로, 동의 없이는 서비스를 이용하실 수 없습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              4. 개인정보의 보유 및 이용기간
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>서비스 이용 중: 이용자가 삭제 요청할 때까지 보관</li>
              <li>앱 삭제 시: 디바이스 내 모든 데이터 즉시 삭제 (서버 데이터는 별도 삭제 요청 필요)</li>
              <li>서버 데이터: 이용자가 삭제 요청 시 즉시 삭제 (자동 백업 파일은 14일 보관)</li>
              <li>Anthropic 전송 데이터: 처리 완료 후 최대 30일 보관 후 자동 삭제</li>
              <li>나노바나나 전송 데이터: 이미지 생성 완료 즉시 자동 삭제</li>
              <li>Sentry 에러 로그: 90일 보관 후 자동 삭제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              5. 개인정보의 파기 절차 및 방법
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>앱 삭제 시 모든 로컬 데이터가 즉시 삭제됩니다</li>
              <li>서버에 저장된 데이터는 이용자의 요청 시 삭제 가능합니다</li>
              <li>삭제 요청 방법: <a href="mailto:heartstampdiary@gmail.com" className="text-[#87A6D1] underline">heartstampdiary@gmail.com</a>으로 연락해주세요</li>
              <li>삭제 처리 시간: 요청 접수 후 7일 이내</li>
              <li>파기 방법: 복구 불가능한 방법으로 영구 삭제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              6. 개인정보의 암호화
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>일기 원문, 감정 태그, AI 코멘트는 AES-256-GCM 암호화로 저장됩니다</li>
              <li>서버 관리자를 포함한 어떤 운영자도 암호화된 데이터를 열람할 수 없습니다</li>
              <li>통신 구간은 HTTPS(TLS 1.2 이상)로 암호화됩니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              7. 이용자의 권리
            </h2>
            <p className="mb-3">이용자는 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정 요구</li>
              <li>개인정보 삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
            </ul>
            <p className="mt-4">
              <strong>권리 행사 방법:</strong> <a href="mailto:heartstampdiary@gmail.com" className="text-[#87A6D1] underline">heartstampdiary@gmail.com</a>으로 연락해주세요
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              8. 개인정보 보호책임자
            </h2>
            <p className="mb-3">
              서비스는 이용자의 개인정보를 보호하고 개인정보와 관련된 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>담당자:</strong> Heart Stamp 팀</p>
              <p><strong>이메일:</strong> <a href="mailto:heartstampdiary@gmail.com" className="text-[#87A6D1] underline">heartstampdiary@gmail.com</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              9. 개인정보 처리방침의 변경
            </h2>
            <p>
              본 개인정보 처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경사항 시행일의 최소 7일 전부터 앱 내 공지사항을 통해 고지할 것입니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              10. 아동의 개인정보 보호
            </h2>
            <p>
              서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 만 14세 미만 아동이 서비스를 이용하려면 법정대리인의 동의가 필요합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              부칙
            </h2>
            <p>
              본 개인정보 처리방침은 2025년 11월 17일부터 시행됩니다.
            </p>
          </section>

          <section className="pt-8 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-center text-[#2F2B4C]/70">
                개인정보 처리와 관련하여 문의사항이 있으시면<br />
                <a href="mailto:heartstampdiary@gmail.com" className="text-[#87A6D1] underline">heartstampdiary@gmail.com</a>으로 연락해주세요.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2F2B4C] text-white/60 py-12 mt-20">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs">
            © 2025 Heart Stamp. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrivacyContent />
    </Suspense>
  );
}
