import './index.css';
import { RouterProvider } from 'react-router-dom';
import { BottomTabHandlerProvider } from '@/shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';
import { router } from './router';

export default function App() {
  return (
    <NavigationProvider debounceTime={500} topThreshold={30} ignoreSmallChanges={10}>
      <BottomTabHandlerProvider>
        <RouterProvider router={router} />
      </BottomTabHandlerProvider>
    </NavigationProvider>
  );
}
