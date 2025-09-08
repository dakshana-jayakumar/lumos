import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAIProvider,
  ProviderConfig,
  AIAnalysisResult,
  VisualAnalysisResult,
  AnalysisContext,
  ProviderError,
  ProviderRateLimitError,
  ProviderQuotaError,
} from './base.js';
import { ErrorAnalysis, TestValidationResult } from '../../types/analysis.js';

export interface AnthropicConfig extends ProviderConfig {
  model?: string;
  baseURL?: string;
}

export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic';
  readonly displayName = 'Anthropic Claude';

  private client: Anthropic | null = null;
  private anthropicConfig: AnthropicConfig;

  constructor(config: AnthropicConfig = {}) {
    super(config);
    this.anthropicConfig = {
      model: 'claude-3-sonnet-20240229',
      ...config,
    };

    if (this.anthropicConfig.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    const options: any = {
      apiKey: this.anthropicConfig.apiKey || '',
      timeout: this.config.timeout || 30000,
    };

    if (this.anthropicConfig.baseURL) {
      options.baseURL = this.anthropicConfig.baseURL;
    }

    this.client = new Anthropic(options);
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.anthropicConfig.apiKey) {
        return false;
      }

      if (!this.client) {
        this.initializeClient();
      }

      // Test with a simple API call
      await (this.client! as any).messages.create({
        model: this.anthropicConfig.model!,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async analyzeError(
    error: ErrorAnalysis,
    context: AnalysisContext
  ): Promise<AIAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('Anthropic client not initialized', this.name);
    }

    const prompt = this.createErrorAnalysisPrompt(error, context);

    return this.withRetry(async () => {
      try {
        const response = await (this.client! as any).messages.create({
          model: this.anthropicConfig.model!,
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.3,
          system:
            'You are an expert software testing engineer. Always respond with valid JSON only, no additional text or formatting.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text' || !content.text) {
          throw new ProviderError('Empty response from Anthropic', this.name);
        }

        // Clean the response to extract JSON
        const jsonText = this.extractJSON(content.text);
        return JSON.parse(jsonText) as AIAnalysisResult;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.error?.type === 'billing_error') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Anthropic API error: ${error.message}`,
          this.name,
          error.error?.type
        );
      }
    });
  }

  async analyzeVisual(
    screenshot: Buffer,
    context: AnalysisContext
  ): Promise<VisualAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('Anthropic client not initialized', this.name);
    }

    const prompt = this.createVisualAnalysisPrompt(context);
    const base64Image = screenshot.toString('base64');

    return this.withRetry(async () => {
      try {
        const response = await (this.client! as any).messages.create({
          model: this.anthropicConfig.model!,
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.3,
          system:
            'You are an expert UI/UX tester. Always respond with valid JSON only, no additional text or formatting.',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text' || !content.text) {
          throw new ProviderError(
            'Empty response from Anthropic Vision',
            this.name
          );
        }

        // Clean the response to extract JSON
        const jsonText = this.extractJSON(content.text);
        return JSON.parse(jsonText) as VisualAnalysisResult;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.error?.type === 'billing_error') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Anthropic Vision API error: ${error.message}`,
          this.name,
          error.error?.type
        );
      }
    });
  }

  async validateTest(
    result: TestValidationResult,
    context: AnalysisContext
  ): Promise<AIAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('Anthropic client not initialized', this.name);
    }

    const prompt = this.createTestValidationPrompt(result, context);

    return this.withRetry(async () => {
      try {
        const response = await (this.client! as any).messages.create({
          model: this.anthropicConfig.model!,
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.3,
          system:
            'You are an expert software testing engineer specializing in test quality assessment. Always respond with valid JSON only, no additional text or formatting.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text' || !content.text) {
          throw new ProviderError('Empty response from Anthropic', this.name);
        }

        // Clean the response to extract JSON
        const jsonText = this.extractJSON(content.text);
        return JSON.parse(jsonText) as AIAnalysisResult;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.error?.type === 'billing_error') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Anthropic API error: ${error.message}`,
          this.name,
          error.error?.type
        );
      }
    });
  }

  async generateFix(
    analysis: AIAnalysisResult,
    context: AnalysisContext
  ): Promise<string> {
    if (!this.client) {
      throw new ProviderError('Anthropic client not initialized', this.name);
    }

    const prompt = this.createFixGenerationPrompt(analysis, context);

    return this.withRetry(async () => {
      try {
        const response = await (this.client! as any).messages.create({
          model: this.anthropicConfig.model!,
          max_tokens: this.config.maxTokens || 4000,
          temperature: 0.1, // Lower temperature for more deterministic code generation
          system:
            'You are an expert software engineer specializing in test automation and bug fixes. Provide clean, production-ready code with clear explanations.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text' || !content.text) {
          throw new ProviderError('Empty response from Anthropic', this.name);
        }

        return content.text;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.error?.type === 'billing_error') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Anthropic API error: ${error.message}`,
          this.name,
          error.error?.type
        );
      }
    });
  }

  private createTestValidationPrompt(
    result: TestValidationResult,
    context: AnalysisContext
  ): string {
    return `
You are analyzing test quality and performance. Provide actionable insights for improvement.

## Test Quality Analysis:
- Overall Score: ${result.overall.score}/100 (Grade: ${result.overall.grade})
- Factors: ${result.overall.factors.map((f) => `${f.name}: ${f.score} (${f.description})`).join('\n  ')}

## Coverage Analysis:
- Lines: ${result.coverage.lines.percentage}% (${result.coverage.lines.covered}/${result.coverage.lines.total})
- Functions: ${result.coverage.functions.percentage}% (${result.coverage.functions.covered}/${result.coverage.functions.total})
- Branches: ${result.coverage.branches.percentage}% (${result.coverage.branches.covered}/${result.coverage.branches.total})

## Coverage Gaps:
${result.coverage.gaps.map((gap) => `- ${gap.file}: ${gap.lines.length} uncovered lines (${gap.priority} priority) - ${gap.reason}`).join('\n')}

## Flaky Test Analysis:
- Flaky Percentage: ${result.flaky.flakyPercentage}%
- Stability Score: ${result.flaky.stabilityScore}
- Flaky Tests: ${result.flaky.flakyTests.length}

## Performance Analysis:
- Average Duration: ${result.performance.averageDuration}ms
- Slowest Tests: ${result.performance.slowestTests.length}
- Timeouts: ${result.performance.timeouts}
- Memory Leaks: ${result.performance.memoryUsage.leaks.length}

## Existing Recommendations:
${result.recommendations.map((r) => `- [${r.priority.toUpperCase()}] ${r.title}: ${r.description}`).join('\n')}

## Context:
- Project Root: ${context.projectRoot}
- Test File: ${context.testFile || 'Unknown'}

Please provide a comprehensive analysis in JSON format with these fields:
- summary: string
- rootCause: string
- suggestions: string[]
- confidence: number (0-1)
- fixCode?: string
- researchQueries?: string[]

Respond with valid JSON only.
`.trim();
  }

  private createFixGenerationPrompt(
    analysis: AIAnalysisResult,
    context: AnalysisContext
  ): string {
    return `
Generate a code fix based on the analysis results.

## Analysis Summary:
${analysis.summary}

## Root Cause:
${analysis.rootCause}

## Suggestions:
${analysis.suggestions.join('\n- ')}

## Context:
- Project Root: ${context.projectRoot}
- Test File: ${context.testFile || 'Unknown'}

## Requirements:
1. Provide complete, working code
2. Include proper TypeScript types
3. Follow best practices for test automation
4. Add helpful comments
5. Consider edge cases and error handling

Generate a complete code solution that addresses the root cause and implements the suggestions.
`.trim();
  }

  /**
   * Extract JSON from Claude's response which might include additional text
   */
  private extractJSON(text: string): string {
    // Look for JSON objects in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // If no JSON found, try to find it between code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1];
    }

    // As fallback, return the text as is and let JSON.parse handle the error
    return text;
  }
}
