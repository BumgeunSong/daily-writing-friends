import { Toaster } from "../ui/toaster";
import { Outlet } from "react-router-dom";
import PullToReload from "./PullToReload";
import BottomTabsNavigator from "./BottomTabsNavigator";

export default function PostLoginLayout() {
  return (
    <div className='flex min-h-screen flex-col pb-16 p-safe'>
      <div className='grow'>
        <PullToReload>
          <Outlet />
        </PullToReload>
      </div>
      <Toaster />
      <BottomTabsNavigator />
    </div>
  );
}
