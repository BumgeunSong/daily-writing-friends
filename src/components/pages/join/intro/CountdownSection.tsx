interface CountdownSectionProps {
    daysRemaining: number
}

const CountdownSection: React.FC<CountdownSectionProps> = ({ daysRemaining }) => (
    <>
        <section className="py-2">
            <p className="text-lg font-medium md:text-xl">다음 기수 시작까지</p>
            <div className="flex items-center mt-2">
                <span className="text-4xl font-bold md:text-5xl">{daysRemaining}</span>
                <span className="text-2xl ml-2 md:text-3xl">일</span>
            </div>
        </section>

        <section className="py-2 mt-6">
            <p className="text-lg font-medium md:text-xl">지금 매일 쓰고 있는 사람</p>
            <div className="flex items-center mt-2">
                <span className="text-4xl font-bold md:text-5xl">19</span>
                <span className="text-2xl ml-2 md:text-3xl">명</span>
            </div>
        </section>
    </>
)

export default CountdownSection
