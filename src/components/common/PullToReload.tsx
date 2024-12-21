import PullToRefresh from 'react-pull-to-refresh';

export default function PullToReload({ children }: { children: React.ReactNode }) {
  const handleRefresh = () => {
    // Logic to refresh your content
    return new Promise<void>((resolve) => {
      window.location.reload();
      resolve();
    });
  };

  return <PullToRefresh onRefresh={handleRefresh}>{children}</PullToRefresh>;
}