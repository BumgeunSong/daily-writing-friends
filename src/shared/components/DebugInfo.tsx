import { useState, useEffect } from 'react';
import { getId } from 'firebase/installations';
import { installations, auth } from '@/firebase';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export function DebugInfo() {
  const [fid, setFid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Get all remote config values
  const { value: tiptapEnabled } = useRemoteConfig('tiptap_editor_enabled');
  const { value: activeBoardId } = useRemoteConfig('active_board_id');
  const { value: blockUserEnabled } = useRemoteConfig('block_user_feature_enabled');
  const { value: secretBuddyEnabled } = useRemoteConfig('secret_buddy_enabled');
  const { value: statPageEnabled } = useRemoteConfig('stat_page_enabled');
  const { value: commentAssistantEnabled } = useRemoteConfig('comment_assistant_enabled');

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

    // Get current user
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
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
      <h1 className='text-3xl font-bold mb-6'>Debug Information</h1>

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
            <div className='animate-pulse bg-muted h-10 rounded'></div>
          ) : (
            <div className='flex items-center gap-4'>
              <code className='flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all'>
                {fid}
              </code>
              <Button onClick={copyToClipboard} variant='outline' size='icon' className='shrink-0'>
                {copied ? (
                  <Check className='h-4 w-4 text-green-600' />
                ) : (
                  <Copy className='h-4 w-4' />
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
            <span className='font-mono text-muted-foreground break-all'>{user?.uid || 'N/A'}</span>

            <span className='font-medium'>Display Name:</span>
            <span className='text-muted-foreground'>{user?.displayName || 'N/A'}</span>
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
            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <span className='font-medium'>TipTap Editor Enabled</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  tiptapEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {tiptapEnabled ? 'TRUE' : 'FALSE'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <span className='font-medium'>Active Board ID</span>
              <code className='text-sm font-mono text-muted-foreground'>{activeBoardId}</code>
            </div>

            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <span className='font-medium'>Block User Feature</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  blockUserEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {blockUserEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <span className='font-medium'>Secret Buddy</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  secretBuddyEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {secretBuddyEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <span className='font-medium'>Stats Page</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  statPageEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {statPageEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
              <span className='font-medium'>Comment Assistant</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  commentAssistantEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {commentAssistantEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
