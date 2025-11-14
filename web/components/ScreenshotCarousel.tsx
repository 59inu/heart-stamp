'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

interface ScreenshotCarouselProps {
  screenshots: {
    src: string;
    alt: string;
  }[];
}

export default function ScreenshotCarousel({ screenshots }: ScreenshotCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="relative">
      {/* Desktop: Static Grid - CSS로 숨김/보임 처리 */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-8 justify-items-center">
        {screenshots.map((screenshot, index) => (
          <div key={index} className="w-[280px]">
            <div className="w-full h-[560px] bg-gradient-to-br from-[#E8DED5] to-[#F7F6F9] rounded-3xl shadow-lg flex items-center justify-center overflow-hidden">
              {screenshot.src ? (
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  width={280}
                  height={560}
                  className="object-cover w-full h-full"
                />
              ) : (
                <p className="text-[#2F2B4C]/30 text-sm">스크린샷 {index + 1}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile/Tablet: Carousel - CSS로 숨김/보임 처리 */}
      <div className="block lg:hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {screenshots.map((screenshot, index) => (
              <div
                key={index}
                className="flex-[0_0_280px] md:flex-[0_0_300px] px-4"
              >
                <div className="w-full h-[500px] md:h-[560px] bg-gradient-to-br from-[#E8DED5] to-[#F7F6F9] rounded-3xl shadow-lg flex items-center justify-center overflow-hidden">
                  {screenshot.src ? (
                    <Image
                      src={screenshot.src}
                      alt={screenshot.alt}
                      width={300}
                      height={560}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <p className="text-[#2F2B4C]/30 text-sm">스크린샷 {index + 1}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={scrollPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all z-10"
          aria-label="이전 스크린샷"
        >
          <svg className="w-6 h-6 text-[#2F2B4C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all z-10"
          aria-label="다음 스크린샷"
        >
          <svg className="w-6 h-6 text-[#2F2B4C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {screenshots.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-[#87A6D1] w-6'
                  : 'bg-[#2F2B4C]/20'
              }`}
              aria-label={`${index + 1}번째 스크린샷으로 이동`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
