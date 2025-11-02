// FAQ 데이터

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_LIST: FAQItem[] = [
  {
    question: '코멘트는 언제 달리나요?',
    answer: '매일 조용한 새벽, 전 날 작성된 일기를 읽고 선생님이 코멘트를 달아드립니다. 단, 자정 전에 제출한 일기만 코멘트를 받을 수 있어요. 아침에 일어나면 따뜻한 코멘트를 받아볼 수 있습니다! 🌙',
  },
  {
    question: '하루에 여러 번 일기를 써도 되나요?',
    answer: '하루에 하나의 일기만 작성할 수 있어요. 하루를 돌아보며 가장 기억에 남는 순간을 기록해보세요. 이미 작성한 일기는 수정할 수 있습니다.',
  },
  {
    question: '일기를 수정하면 코멘트도 업데이트되나요?',
    answer: '일기 수정은 가능하지만, 한 번 받은 선생님 코멘트는 업데이트되지 않습니다. 코멘트는 처음 작성한 일기를 기준으로 달리니, 신중하게 작성해주세요!',
  },
  {
    question: '감정 리포트는 언제 갱신되나요?',
    answer: '주간 감정 리포트는 한 주가 끝나면(일요일 자정) 생성할 수 있어요. 한 번 생성된 리포트는 과거 일기를 수정해도 업데이트되지 않아요. 의미 있는 리포트를 기대하려면 꾸준히 일기를 작성해보세요!',
  },
];

// 문의하기 구글폼 URL
export const CONTACT_FORM_URL = 'https://forms.gle/6cqKftCegLaNTjGo9';
