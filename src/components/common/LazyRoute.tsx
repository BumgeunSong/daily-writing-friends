import { Suspense } from 'react';

export const LazyRoute = ({ element: Element }: { element: React.ComponentType }) => (
    <Suspense fallback={<LoadingFallback />}>
        <Element />
    </Suspense>
);

const LoadingFallback = () => (
    <div className="p-4">
        <div className="mb-4 h-6 w-1/2 animate-pulse bg-gray-200"></div>
        <ul className="space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
                <li key={index} className="h-6 w-full animate-pulse bg-gray-200"></li>
            ))}
        </ul>
    </div>
);