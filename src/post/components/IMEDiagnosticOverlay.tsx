import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { X, Download, Trash2, BarChart2, Bug } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface IMEDiagnosticOverlayProps {
  imeState: {
    isComposing: boolean;
    compositionText: string;
    lastCompositionEnd: string;
    eventCount: number;
  };
  imeLogger: any;
  onClose?: () => void;
}

export function IMEDiagnosticOverlay({ imeState, imeLogger, onClose }: IMEDiagnosticOverlayProps) {
  const [stats, setStats] = useState<any>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(imeLogger.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [imeLogger]);

  if (minimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50 md:bottom-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMinimized(false)}
          className="bg-background shadow-lg"
        >
          <Bug className="size-4 mr-2" />
          IME Debug
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-20 right-4 z-50 md:bottom-4",
      "w-80 p-4 rounded-lg border bg-background shadow-lg",
      "max-h-96 overflow-y-auto"
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bug className="size-4" />
          IME Diagnostics
        </h3>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() => setMinimized(true)}
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Current State */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "size-2 rounded-full",
            imeState.isComposing ? "bg-yellow-500 animate-pulse" : "bg-green-500"
          )} />
          <span className="font-medium">
            {imeState.isComposing ? 'Composing' : 'Ready'}
          </span>
        </div>
        
        {imeState.isComposing && (
          <div className="p-2 bg-muted rounded text-sm">
            <div className="text-xs text-muted-foreground mb-1">Current composition:</div>
            <div className="font-mono">{imeState.compositionText || '(empty)'}</div>
          </div>
        )}

        {imeState.lastCompositionEnd && (
          <div className="p-2 bg-muted rounded text-sm">
            <div className="text-xs text-muted-foreground mb-1">Last composition:</div>
            <div className="font-mono">{imeState.lastCompositionEnd}</div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="p-3 bg-muted rounded mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart2 className="size-4" />
            Statistics
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="font-mono">{stats.total}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Success Rate</div>
              <div className="font-mono">{stats.successRate}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Successful</div>
              <div className="font-mono text-green-600">{stats.successful}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Failed</div>
              <div className="font-mono text-red-600">{stats.failed}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => imeLogger.downloadLogs()}
          className="flex-1"
        >
          <Download className="size-3 mr-1" />
          Export
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            imeLogger.clearLogs();
            setStats(imeLogger.getStats());
          }}
          className="flex-1"
        >
          <Trash2 className="size-3 mr-1" />
          Clear
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => imeLogger.printStats()}
          className="flex-1"
        >
          <BarChart2 className="size-3 mr-1" />
          Log
        </Button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        <div>Test Korean input: ㅅ+ㅗ+ㅇ → 송</div>
        <div>Check console for detailed logs</div>
      </div>
    </div>
  );
}