import { getId } from 'firebase/installations';
import { Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { installations } from '@/firebase';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { Button } from '@/shared/ui/button';
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
  const [fid, setFid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { currentUser: user } = useAuth();

  // Get all remote config values
  const { value: activeBoardId } = useRemoteConfig('active_board_id');
  const { value: blockUserEnabled } = useRemoteConfig('block_user_feature_enabled');

  useEffect(() => {
    // Get Firebase Installation ID
    const fetchFID = async () => {
      try {
        const installationId = await getId(installations);
        setFid(installationId);
      } catch (error) {
        console.error('Error getting Firebase Installation ID:', error);
        setFid('Error loading FID');
      } finally {
        setLoading(false);
      }
    };

    fetchFID();
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fid);
      setCopied(true);
      toast.success('Firebase Installation ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className='container mx-auto max-w-4xl p-6'>
      <h1 className='mb-6 text-3xl font-bold'>Debug Information</h1>

      {/* Firebase Installation ID */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Firebase Installation ID (FID)</CardTitle>
          <CardDescription>
            Use this ID in Firebase Console Remote Config to create admin conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='h-10 animate-pulse rounded bg-muted' />
          ) : (
            <div className='flex items-center gap-4'>
              <code className='flex-1 break-all rounded-md bg-muted p-3 font-mono text-sm'>
                {fid}
              </code>
              <Button onClick={copyToClipboard} variant='outline' size='icon' className='shrink-0'>
                {copied ? (
                  <Check className='size-4 text-green-600' />
                ) : (
                  <Copy className='size-4' />
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
          <CardDescription>Current values from Firebase Remote Config</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <ConfigRow label='Active Board ID' value={activeBoardId} type='text' />
            <ConfigRow label='Block User Feature' value={blockUserEnabled} type='feature' />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
