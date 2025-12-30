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

    // Only process result messages
    if (msg.type !== "result") return;

    let inputTokens = 0;
    let outputTokens = 0;

    // Option 1: Extract from modelUsage (SDK ModelUsage format)
    // modelUsage: { [modelName]: { inputTokens, outputTokens, ... } }
    if (msg.modelUsage && typeof msg.modelUsage === "object") {
      const modelUsage = msg.modelUsage as Record<
        string,
        { inputTokens?: number; outputTokens?: number }
      >;
      for (const modelName of Object.keys(modelUsage)) {
        const usage = modelUsage[modelName];
        if (usage) {
          inputTokens += usage.inputTokens ?? 0;
          outputTokens += usage.outputTokens ?? 0;
        }
      }
    }

    // Option 2: Fallback to usage object (Anthropic API format)
    // usage: { input_tokens, output_tokens, ... }
    if (inputTokens === 0 && outputTokens === 0 && msg.usage && typeof msg.usage === "object") {
      const usage = msg.usage as { input_tokens?: number; output_tokens?: number };
      inputTokens = usage.input_tokens ?? 0;
      outputTokens = usage.output_tokens ?? 0;
    }

    if (inputTokens > 0 || outputTokens > 0) {
      this.add(stage, { inputTokens, outputTokens });
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
