import React from 'react';

interface CountdownSectionProps {
  daysRemaining: number;
}

const CountdownSection: React.FC<CountdownSectionProps> = ({ daysRemaining }) => (
  <>
  <section className="py-4">
    <p className="text-lg font-medium">다음 기수 시작까지</p>
    <div className="flex items-center mt-2">
      <span className="text-4xl font-bold">{daysRemaining}</span>
      <span className="text-2xl ml-2">일</span>
    </div>
  </section>

  <section className="py-4">
    <p className="text-lg font-medium">지금 매일 쓰고 있는 사람</p>
    <div className="flex items-center mt-2">
      <span className="text-4xl font-bold">19</span>
        <span className="text-2xl ml-2">명</span>
      </div>
    </section>
  </>
);

export default CountdownSection; 