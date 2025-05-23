interface CountdownSectionProps {
    daysRemaining: number
    activeUserCount: number
}

const CountdownSection: React.FC<CountdownSectionProps> = ({ daysRemaining, activeUserCount }) => (
    <>
        <section className="py-2">
            <p className="text-lg font-medium md:text-xl">다음 기수 시작까지</p>
            <div className="mt-2 flex items-center">
                <span className="text-4xl font-bold md:text-5xl">{daysRemaining}</span>
                <span className="ml-2 text-2xl md:text-3xl">일</span>
            </div>
        </section>

        <section className="mt-6 py-2">
            <p className="text-lg font-medium md:text-xl">지금 매일 쓰고 있는 사람</p>
            <div className="mt-2 flex items-center">
                <span className="text-4xl font-bold md:text-5xl">{activeUserCount}</span>
                <span className="ml-2 text-2xl md:text-3xl">명</span>
            </div>
        </section>
    </>
)

export default CountdownSection
