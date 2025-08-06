const StatsHeader = () => {
    return (
        <header className="bg-background py-3">
            <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
                <div className="flex min-h-[44px] items-center space-x-2 rounded-lg p-2">
                    <span className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">기록</span>
                </div>
            </div>
        </header>
    );
};

export default StatsHeader;

