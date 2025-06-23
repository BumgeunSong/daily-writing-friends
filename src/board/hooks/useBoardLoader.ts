import { LoaderFunctionArgs } from 'react-router-dom';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/api/user';

export async function boardLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;
  
  if (!boardId) {
    throw new Response('Missing board ID', { status: 400 });
  }

  try {
    // Get current user
    const user = await getCurrentUser();
    
    if (!user) {
      // Return empty data instead of throwing, let route guard handle auth
      return { boardId };
    }
    
    // Check board permissions before allowing access
    const userData = await fetchUser(user.uid);
    if (!userData) {
      throw new Response('User data not found', { status: 403 });
    }
    
    const userPermission = userData.boardPermissions?.[boardId];
    if (userPermission !== 'read' && userPermission !== 'write') {
      throw new Response('Access denied - insufficient board permissions', { status: 403 });
    }
    
    return { boardId };
  } catch (error) {
    console.error('Failed to validate board access:', error);
    if (error instanceof Response) {
      throw error; // Re-throw Response errors (permission/auth errors)
    }
    throw new Response('Board access validation failed', { status: 500 });
  }
}