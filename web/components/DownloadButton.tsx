'use client';

import { useState } from 'react';

interface DownloadButtonProps {
  className?: string;
  size?: 'default' | 'large';
}

export default function DownloadButton({ className = '', size = 'default' }: DownloadButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const appStoreUrl = 'https://apps.apple.com/app/id6755212868';
  const isAppLive = false; // 심사 승인 후 true로 변경
  const sheetDBUrl = 'https://sheetdb.io/api/v1/sjcbusuu2zdou';
  const baseCount = 15; // 베이스 카운트 (가짜)

  const handleClick = (e: React.MouseEvent) => {
    // Google Analytics 이벤트 추적
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'download_button_click', {
        event_category: 'engagement',
        event_label: isAppLive ? 'app_store_redirect' : 'coming_soon_modal',
      });
    }

    if (!isAppLive) {
      e.preventDefault();
      setShowModal(true);
      // 모달 열 때 대기자 수 가져오기
      fetchWaitlistCount();
    }
    // isAppLive가 true면 그냥 링크로 이동
  };

  const fetchWaitlistCount = async () => {
    try {
      const response = await fetch(sheetDBUrl);
      if (response.ok) {
        const data = await response.json();
        const actualCount = Array.isArray(data) ? data.length : 0;
        setWaitlistCount(baseCount + actualCount);
      }
    } catch (error) {
      console.error('Failed to fetch waitlist count:', error);
      // 실패하면 베이스 카운트만 표시
      setWaitlistCount(baseCount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 이메일 유효성 검사
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('올바른 이메일 주소를 입력해주세요.');
        setIsSubmitting(false);
        return;
      }

      // SheetDB에 저장
      const response = await fetch(sheetDBUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            email: email,
            timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          }
        }),
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다.');
      }

      // Google Analytics 이벤트 추적
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'waitlist_signup', {
          event_category: 'engagement',
          event_label: 'email_submitted',
        });
      }

      setIsSubmitted(true);
      setEmail('');
      // 제출 후 카운트 업데이트
      if (waitlistCount !== null) {
        setWaitlistCount(waitlistCount + 1);
      }
    } catch (err) {
      setError('알림 신청에 실패했습니다. 다시 시도해주세요.');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setIsSubmitted(false);
    setEmail('');
    setError('');
  };

  const sizeClasses = size === 'large'
    ? 'px-12 py-5 text-lg'
    : 'px-10 py-4 text-base';

  return (
    <>
      <a
        href={appStoreUrl}
        onClick={handleClick}
        className={`inline-block bg-[#87A6D1] text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all hover:scale-105 ${sizeClasses} ${className}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        App Store에서 다운로드
      </a>

      {/* 곧 만나요 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={handleClose}
              className="absolute -top-10 right-2 text-white hover:text-white/80 transition-colors drop-shadow-lg"
              aria-label="닫기"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {!isSubmitted ? (
              <div className="text-center">
                <div className="text-5xl mb-6">⏳</div>
                <h3 className="text-2xl font-light text-[#2F2B4C] mb-4">
                  곧 만나요!
                </h3>
                <p className="text-[#2F2B4C]/70 leading-relaxed mb-4">
                  Heart Stamp는 현재 App Store 심사 중이에요.<br />
                  출시 알림을 받아보시겠어요?
                </p>
                {waitlistCount !== null && (
                  <p className="text-sm text-[#87A6D1] mb-6">
                    현재 {waitlistCount}명이 출시를 기다리고 있어요
                  </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 rounded-full border border-[#2F2B4C]/20 focus:outline-none focus:border-[#87A6D1] transition-colors text-[#2F2B4C] placeholder:text-[#2F2B4C]/40"
                    disabled={isSubmitting}
                    required
                  />

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#87A6D1] text-white py-3 rounded-full font-medium hover:bg-[#87A6D1]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '신청 중...' : '출시 알림 신청'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-6">✨</div>
                <h3 className="text-2xl font-light text-[#2F2B4C] mb-4">
                  신청 완료!
                </h3>
                <p className="text-[#2F2B4C]/70 leading-relaxed mb-6">
                  출시 소식을 이메일로 보내드릴게요.<br />
                  조금만 기다려주세요 😊
                </p>
                <button
                  onClick={handleClose}
                  className="w-full bg-[#87A6D1] text-white py-3 rounded-full font-medium hover:bg-[#87A6D1]/90 transition-colors"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
