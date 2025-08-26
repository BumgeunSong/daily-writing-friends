interface IMELogEntry {
  timestamp: Date;
  eventType: string;
  eventData: string;
  compositionData: string;
  editorState: {
    selection: { from: number; to: number };
    content: string;
  };
  browser: string;
  inputSequence: string[];
  result: 'success' | 'failure' | 'pending';
}

class IMELogger {
  private logs: IMELogEntry[] = [];
  private currentSequence: string[] = [];
  private compositionStartTime: number | null = null;
  private isComposing = false;
  private enabled = true;

  constructor() {
    this.browser = this.detectBrowser();
  }

  private browser: string;

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1]}`;
    if (ua.includes('Safari') && !ua.includes('Chrome')) return `Safari ${ua.match(/Version\/(\d+)/)?.[1]}`;
    if (ua.includes('Firefox')) return `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1]}`;
    return ua;
  }

  logCompositionStart(event: CompositionEvent, editorState?: any) {
    if (!this.enabled) return;
    
    this.isComposing = true;
    this.compositionStartTime = Date.now();
    this.currentSequence = [];
    
    const logEntry = {
      timestamp: new Date(),
      eventType: 'compositionstart',
      eventData: event.data,
      compositionData: '',
      editorState: editorState || { selection: { from: 0, to: 0 }, content: '' },
      browser: this.browser,
      inputSequence: [...this.currentSequence],
      result: 'pending' as const,
    };
    
    this.logs.push(logEntry);
    
    console.log(
      '%c🔵 [IME] Composition Start',
      'color: #3B82F6; font-weight: bold',
      '\n  Time:', new Date().toLocaleTimeString() + '.' + Date.now() % 1000,
      '\n  Data:', event.data || '(empty)',
      '\n  Selection:', editorState?.selection,
    );
  }

  logCompositionUpdate(event: CompositionEvent, editorState?: any) {
    if (!this.enabled) return;
    
    this.currentSequence.push(event.data);
    
    const logEntry = {
      timestamp: new Date(),
      eventType: 'compositionupdate',
      eventData: event.data,
      compositionData: event.data,
      editorState: editorState || { selection: { from: 0, to: 0 }, content: '' },
      browser: this.browser,
      inputSequence: [...this.currentSequence],
      result: 'pending' as const,
    };
    
    this.logs.push(logEntry);
    
    console.log(
      '%c🟡 [IME] Composition Update',
      'color: #EAB308; font-weight: bold',
      '\n  Time:', new Date().toLocaleTimeString() + '.' + Date.now() % 1000,
      '\n  Data:', event.data,
      '\n  Sequence:', this.currentSequence.join(' → '),
    );
  }

  logCompositionEnd(event: CompositionEvent, editorState?: any, actualOutput?: string) {
    if (!this.enabled) return;
    
    const duration = this.compositionStartTime ? Date.now() - this.compositionStartTime : 0;
    this.isComposing = false;
    
    const expectedOutput = event.data;
    const success = !actualOutput || actualOutput === expectedOutput;
    
    const logEntry = {
      timestamp: new Date(),
      eventType: 'compositionend',
      eventData: event.data,
      compositionData: event.data,
      editorState: editorState || { selection: { from: 0, to: 0 }, content: '' },
      browser: this.browser,
      inputSequence: [...this.currentSequence],
      result: success ? 'success' as const : 'failure' as const,
    };
    
    this.logs.push(logEntry);
    
    const logStyle = success 
      ? 'color: #10B981; font-weight: bold' 
      : 'color: #EF4444; font-weight: bold';
    const icon = success ? '🟢' : '🔴';
    
    console.log(
      `%c${icon} [IME] Composition End`,
      logStyle,
      '\n  Time:', new Date().toLocaleTimeString() + '.' + Date.now() % 1000,
      '\n  Duration:', duration + 'ms',
      '\n  Final:', event.data,
      '\n  Sequence:', this.currentSequence.join(' → '),
      '\n  Expected:', expectedOutput,
      '\n  Actual:', actualOutput || '(not provided)',
      '\n  Success:', success,
    );
    
    if (!success) {
      console.warn('❌ IME Composition Failed!', {
        expected: expectedOutput,
        actual: actualOutput,
        sequence: this.currentSequence,
        browser: this.browser,
      });
    }
    
    this.compositionStartTime = null;
    this.currentSequence = [];
  }

  logBeforeInput(event: InputEvent, editorState?: any) {
    if (!this.enabled) return;
    
    console.log(
      '%c⚪ [IME] Before Input',
      'color: #6B7280; font-weight: bold',
      '\n  Type:', event.inputType,
      '\n  Data:', event.data,
      '\n  CompositionRelated:', event.isComposing,
      '\n  DataTransfer:', event.dataTransfer,
    );
  }

  logInput(event: Event, editorState?: any) {
    if (!this.enabled) return;
    
    const target = event.target as HTMLElement;
    console.log(
      '%c⚪ [IME] Input',
      'color: #6B7280; font-weight: bold',
      '\n  Target:', target.tagName,
      '\n  Content:', target.textContent?.slice(-20),
      '\n  IsComposing:', this.isComposing,
    );
  }

  logKeyEvent(event: KeyboardEvent, type: 'down' | 'up') {
    if (!this.enabled || !this.isComposing) return;
    
    console.log(
      `%c⌨️  [IME] Key ${type}`,
      'color: #8B5CF6; font-weight: bold',
      '\n  Key:', event.key,
      '\n  Code:', event.code,
      '\n  IsComposing:', event.isComposing,
    );
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  downloadLogs() {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ime-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 IME logs downloaded');
  }

  clearLogs() {
    this.logs = [];
    this.currentSequence = [];
    console.log('🗑️  IME logs cleared');
  }

  enable() {
    this.enabled = true;
    console.log('✅ IME logging enabled');
  }

  disable() {
    this.enabled = false;
    console.log('⏸️  IME logging disabled');
  }

  getStats() {
    const total = this.logs.filter(l => l.eventType === 'compositionend').length;
    const successful = this.logs.filter(l => l.result === 'success').length;
    const failed = this.logs.filter(l => l.result === 'failure').length;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
    };
  }

  printStats() {
    const stats = this.getStats();
    console.log(
      '%c📊 IME Statistics',
      'color: #3B82F6; font-weight: bold; font-size: 14px',
      '\n  Total Compositions:', stats.total,
      '\n  Successful:', stats.successful,
      '\n  Failed:', stats.failed,
      '\n  Success Rate:', stats.successRate + '%',
    );
  }
}

export const imeLogger = new IMELogger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).imeLogger = imeLogger;
  console.log(
    '%c🔍 IME Logger Ready',
    'color: #10B981; font-weight: bold; font-size: 14px',
    '\n\nAvailable commands:',
    '\n  window.imeLogger.printStats() - Show statistics',
    '\n  window.imeLogger.downloadLogs() - Download logs as JSON',
    '\n  window.imeLogger.clearLogs() - Clear all logs',
    '\n  window.imeLogger.disable() - Disable logging',
    '\n  window.imeLogger.enable() - Enable logging',
  );
}