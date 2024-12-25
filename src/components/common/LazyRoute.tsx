import { Suspense } from 'react';

export const LazyRoute = ({ element: Element }: { element: React.ComponentType }) => (
    <Suspense fallback={<LoadingFallback />}>
        <Element />
    </Suspense>
);

const LoadingFallback = () => (
    <div>Loading...</div>
);