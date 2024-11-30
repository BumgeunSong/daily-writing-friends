import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface StatusMessageProps {
  isLoading?: boolean;
  error?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({
  isLoading,
  error,
  loadingMessage = '로딩 중...',
  errorMessage = '잠깐 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {isLoading && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium text-gray-600">{loadingMessage}</p>
        </>
      )}
      {error && (
        <>
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="mt-4 text-lg font-medium text-gray-600">{errorMessage}</p>
        </>
      )}
    </div>
  );
};

export default StatusMessage;

