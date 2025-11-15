'use client';

import { useState } from 'react';

interface DownloadButtonProps {
  className?: string;
  size?: 'default' | 'large';
}

export default function DownloadButton({ className = '', size = 'default' }: DownloadButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const appStoreUrl = 'https://apps.apple.com/app/id6755212868';
  const isAppLive = false; // 심사 승인 후 true로 변경

  const handleClick = (e: React.MouseEvent) => {
    // Google Analytics 이벤트 추적
    if (typeof window !== 'undefined') {
      const gtag = (window as any).gtag;
      if (gtag) {
        gtag('event', 'download_button_click', {
          event_category: 'engagement',
          event_label: isAppLive ? 'app_store_redirect' : 'coming_soon_modal',
        });
        console.log('[GA] Event sent: download_button_click');
      } else {
        console.warn('[GA] gtag not found');
      }
    }

    if (!isAppLive) {
      e.preventDefault();
      setShowModal(true);
    }
    // isAppLive가 true면 그냥 링크로 이동
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl mb-6">⏳</div>
              <h3 className="text-2xl font-light text-[#2F2B4C] mb-4">
                곧 만나요!
              </h3>
              <p className="text-[#2F2B4C]/70 leading-relaxed mb-6">
                Heart Stamp는 현재 App Store 심사 중이에요.<br />
                조금만 기다려주시면 곧 만날 수 있어요 😊
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-[#87A6D1] text-white py-3 rounded-full font-medium hover:bg-[#87A6D1]/90 transition-colors"
              >
                알겠어요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
