// scripts/agents/token-tracker.ts

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StageTokenUsage {
  stage: string;
  usage: TokenUsage;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export class TokenTracker {
  private usages: StageTokenUsage[] = [];

  add(stage: string, usage: TokenUsage): void {
    this.usages.push({ stage, usage });
  }

  addFromMessage(stage: string, message: unknown): void {
    if (!message || typeof message !== "object") return;

    const msg = message as Record<string, unknown>;

    if (msg.type === "result" && msg.subtype === "success") {
      const inputTokens =
        typeof msg.input_tokens === "number" ? msg.input_tokens : 0;
      const outputTokens =
        typeof msg.output_tokens === "number" ? msg.output_tokens : 0;

      if (inputTokens > 0 || outputTokens > 0) {
        this.add(stage, { inputTokens, outputTokens });
      }
    }
  }

  getTotal(): TokenUsage {
    return this.usages.reduce(
      (total, { usage }) => ({
        inputTokens: total.inputTokens + usage.inputTokens,
        outputTokens: total.outputTokens + usage.outputTokens,
      }),
      { inputTokens: 0, outputTokens: 0 }
    );
  }

  getByStage(): StageTokenUsage[] {
    return [...this.usages];
  }

  formatUsage(usage: TokenUsage): string {
    return `${formatTokenCount(usage.inputTokens)} input / ${formatTokenCount(usage.outputTokens)} output`;
  }

  formatTotal(): string {
    const total = this.getTotal();
    return this.formatUsage(total);
  }

  formatBreakdown(): string {
    if (this.usages.length === 0) {
      return "No token usage recorded";
    }

    const lines = this.usages.map(
      ({ stage, usage }) => `  - ${stage}: ${this.formatUsage(usage)}`
    );
    lines.push(`  **Total: ${this.formatTotal()}**`);
    return lines.join("\n");
  }

  reset(): void {
    this.usages = [];
  }
}

export const globalTokenTracker = new TokenTracker();
