import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfig } from '@/shared/hooks/useRemoteConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

// Helper function to get status badge styles
const getStatusBadgeClass = (isEnabled: boolean, type: 'boolean' | 'feature' = 'feature') => {
  if (type === 'boolean') {
    return isEnabled
      ? 'px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800'
      : 'px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800';
  }
  return isEnabled
    ? 'px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800'
    : 'px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800';
};

// Helper component for config row
interface ConfigRowProps {
  label: string;
  value: string | boolean;
  type?: 'boolean' | 'feature' | 'text';
}

const getConfigLabel = (value: boolean, type: ConfigRowProps['type']): string => {
  if (value) return type === 'boolean' ? 'TRUE' : 'ENABLED';
  return type === 'boolean' ? 'FALSE' : 'DISABLED';
};

const ConfigRow = ({ label, value, type = 'feature' }: ConfigRowProps) => {
  const isBoolean = typeof value === 'boolean';

  return (
    <div className='flex items-center justify-between rounded-lg bg-muted/50 p-3'>
      <span className='font-medium'>{label}</span>
      {isBoolean ? (
        <span className={getStatusBadgeClass(value, type as 'boolean' | 'feature')}>
          {getConfigLabel(value, type)}
        </span>
      ) : (
        <code className='font-mono text-sm text-muted-foreground'>{value}</code>
      )}
    </div>
  );
};

export function DebugInfo() {
  const { currentUser: user } = useAuth();

  const { value: activeBoardId } = useRemoteConfig('active_board_id');

  return (
    <div className='container mx-auto max-w-4xl p-6'>
      <h1 className='mb-6 text-3xl font-bold'>Debug Information</h1>

      {/* User Information */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            <span className='font-medium'>Email:</span>
            <span className='font-mono text-muted-foreground'>
              {user?.email || 'Not logged in'}
            </span>

            <span className='font-medium'>UID:</span>
            <span className='break-all font-mono text-muted-foreground'>{user?.uid || 'N/A'}</span>

            <span className='font-medium'>Display Name:</span>
            <span className='text-muted-foreground'>{user?.displayName ?? 'N/A'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Remote Config Values */}
      <Card>
        <CardHeader>
          <CardTitle>Remote Config Values</CardTitle>
          <CardDescription>Current values from Supabase app_config</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <ConfigRow label='Active Board ID' value={activeBoardId} type='text' />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
