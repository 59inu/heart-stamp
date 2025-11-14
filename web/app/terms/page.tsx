import Link from 'next/link';

export const metadata = {
  title: '서비스 이용약관 - Heart Stamp',
  description: 'Heart Stamp 서비스 이용약관',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <Link href="/" className="text-[#87A6D1] hover:text-[#6B8AB8] transition-colors">
            ← 홈으로
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-light text-[#2F2B4C] mb-8">
          서비스 이용약관
        </h1>

        <div className="text-[#2F2B4C]/80 leading-relaxed space-y-8">
          <section>
            <p className="text-sm text-[#2F2B4C]/60 mb-8">
              시행일: 2025년 11월 2일
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 1조 (목적)
            </h2>
            <p>
              본 약관은 Heart Stamp(이하 "서비스")의 이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 2조 (정의)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. "서비스"란 이용자가 일기를 작성하고 AI 기반 코멘트를 받을 수 있는 모바일 애플리케이션 Heart Stamp를 의미합니다.
              </p>
              <p>
                2. "이용자"란 본 약관에 따라 서비스를 이용하는 자를 말합니다.
              </p>
              <p>
                3. "일기"란 이용자가 서비스를 통해 작성한 텍스트, 이미지 등의 콘텐츠를 의미합니다.
              </p>
              <p>
                4. "AI 코멘트"란 인공지능 기술을 활용하여 일기에 대한 피드백을 제공하는 기능을 의미합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 3조 (약관의 효력 및 변경)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.
              </p>
              <p>
                2. 본 약관의 내용은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지하고, 이에 동의한 이용자가 서비스에 가입함으로써 효력이 발생합니다.
              </p>
              <p>
                3. 서비스 제공자는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 약관이 변경되는 경우 공지사항을 통해 공지합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 4조 (서비스의 제공)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 서비스는 다음과 같은 기능을 제공합니다:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>일기 작성 및 저장 (오늘 또는 과거 날짜)</li>
                <li>AI 기반 일기 코멘트 생성</li>
                <li>감정 분석 및 주간/월간 리포트</li>
                <li>감정 스탬프 컬렉션 및 통계</li>
                <li>일기 목록 조회 및 검색</li>
              </ul>
              <p className="mt-2">
                2. 서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 정기점검, 증설 및 교체, 고장 등 부득이한 사유가 발생한 경우 서비스의 제공이 일시 중단될 수 있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 5조 (서비스 이용)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 이용자는 본 약관 및 개인정보 처리방침에 동의함으로써 서비스를 이용할 수 있습니다.
              </p>
              <p>
                2. 이용자는 오늘 또는 과거 날짜의 일기를 자유롭게 작성할 수 있습니다. 하루에 여러 개의 일기를 작성할 수 있으며, 미래 날짜의 일기는 작성할 수 없습니다.
              </p>
              <p>
                3. AI 코멘트는 매일 새벽 3시에 전날(오늘 날짜 기준) 작성된 일기에 대해서만 생성되며, 오전 8시 30분에 푸시 알림으로 제공됩니다. 과거 날짜로 작성된 일기에는 AI 코멘트가 생성되지 않습니다.
              </p>
              <p>
                4. 이용자가 작성한 일기는 암호화되어 저장되며, 이용자 본인만 열람할 수 있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 6조 (이용자의 의무)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 이용자는 다음 행위를 하여서는 안 됩니다:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>타인의 정보 도용</li>
                <li>서비스의 정보를 이용한 영리 행위</li>
                <li>타인의 명예를 손상시키거나 불이익을 주는 행위</li>
                <li>서비스의 운영을 고의로 방해하는 행위</li>
                <li>기타 불법적이거나 부당한 행위</li>
              </ul>
              <p className="mt-2">
                2. 이용자는 관계 법령, 본 약관, 이용안내 및 서비스와 관련하여 공지한 주의사항 등을 준수하여야 합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 7조 (개인정보 보호)
            </h2>
            <p className="ml-4">
              서비스 제공자는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련 법령 및 서비스의 개인정보 처리방침이 적용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 8조 (저작권)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 서비스 내 모든 콘텐츠(텍스트, 이미지, 디자인 등)에 대한 저작권은 서비스 제공자 또는 해당 권리자에게 귀속됩니다.
              </p>
              <p>
                2. 이용자가 작성한 일기에 대한 저작권은 이용자에게 있으며, 서비스 제공자는 서비스 운영 목적으로만 사용합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 9조 (책임의 제한)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 서비스 제공자는 천재지변, 전쟁 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
              </p>
              <p>
                2. AI 코멘트는 자동화된 시스템에 의해 생성되므로, 그 내용의 정확성이나 적절성을 보장하지 않습니다.
              </p>
              <p>
                3. 서비스 제공자는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 10조 (서비스 이용의 제한 및 중지)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 서비스 제공자는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
              </p>
              <p>
                2. 이용자는 언제든지 앱을 삭제하여 서비스 이용을 중단할 수 있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              제 11조 (분쟁 해결)
            </h2>
            <div className="space-y-2 ml-4">
              <p>
                1. 서비스 이용과 관련하여 발생한 분쟁에 대해 당사자 간 협의가 이루어지지 않을 경우, 관련 법령에 따라 해결합니다.
              </p>
              <p>
                2. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 대한민국 법원을 관할 법원으로 합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#2F2B4C] mb-4">
              부칙
            </h2>
            <p className="ml-4">
              본 약관은 2025년 11월 2일부터 시행됩니다.
            </p>
          </section>

          <section className="pt-8 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-center text-[#2F2B4C]/70">
                문의사항이 있으시면 <a href="mailto:heartstampdiary@gmail.com" className="text-[#87A6D1] underline">heartstampdiary@gmail.com</a>으로 연락해주세요.
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
