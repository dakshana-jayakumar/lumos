import OpenAI from 'openai';
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

export interface OpenAIConfig extends ProviderConfig {
  model?: string;
  organization?: string;
  baseURL?: string;
}

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI GPT';

  private client: OpenAI | null = null;
  private openaiConfig: OpenAIConfig;

  constructor(config: OpenAIConfig = {}) {
    super(config);
    this.openaiConfig = {
      model: 'gpt-4-turbo-preview',
      ...config,
    };

    if (this.openaiConfig.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    this.client = new OpenAI({
      apiKey: this.openaiConfig.apiKey,
      organization: this.openaiConfig.organization,
      baseURL: this.openaiConfig.baseURL,
      timeout: this.config.timeout,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.openaiConfig.apiKey) {
        return false;
      }

      if (!this.client) {
        this.initializeClient();
      }

      // Test with a simple API call
      await this.client!.models.list();
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
      throw new ProviderError('OpenAI client not initialized', this.name);
    }

    const prompt = this.createErrorAnalysisPrompt(error, context);

    return this.withRetry(async () => {
      try {
        const response = await this.client!.chat.completions.create({
          model: this.openaiConfig.model!,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert software testing engineer. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.3,
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new ProviderError('Empty response from OpenAI', this.name);
        }

        return JSON.parse(content) as AIAnalysisResult;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.code === 'insufficient_quota') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `OpenAI API error: ${error.message}`,
          this.name,
          error.code
        );
      }
    });
  }

  async analyzeVisual(
    screenshot: Buffer,
    context: AnalysisContext
  ): Promise<VisualAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('OpenAI client not initialized', this.name);
    }

    const prompt = this.createVisualAnalysisPrompt(context);
    const base64Image = screenshot.toString('base64');

    return this.withRetry(async () => {
      try {
        const response = await this.client!.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert UI/UX tester. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.3,
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new ProviderError(
            'Empty response from OpenAI Vision',
            this.name
          );
        }

        return JSON.parse(content) as VisualAnalysisResult;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.code === 'insufficient_quota') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `OpenAI Vision API error: ${error.message}`,
          this.name,
          error.code
        );
      }
    });
  }

  async validateTest(
    result: TestValidationResult,
    context: AnalysisContext
  ): Promise<AIAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('OpenAI client not initialized', this.name);
    }

    const prompt = this.createTestValidationPrompt(result, context);

    return this.withRetry(async () => {
      try {
        const response = await this.client!.chat.completions.create({
          model: this.openaiConfig.model!,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert software testing engineer specializing in test quality assessment. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: this.config.maxTokens || 4000,
          temperature: this.config.temperature || 0.3,
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new ProviderError('Empty response from OpenAI', this.name);
        }

        return JSON.parse(content) as AIAnalysisResult;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.code === 'insufficient_quota') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `OpenAI API error: ${error.message}`,
          this.name,
          error.code
        );
      }
    });
  }

  async generateFix(
    analysis: AIAnalysisResult,
    context: AnalysisContext
  ): Promise<string> {
    if (!this.client) {
      throw new ProviderError('OpenAI client not initialized', this.name);
    }

    const prompt = this.createFixGenerationPrompt(analysis, context);

    return this.withRetry(async () => {
      try {
        const response = await this.client!.chat.completions.create({
          model: this.openaiConfig.model!,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert software engineer specializing in test automation and bug fixes. Provide clean, production-ready code.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: this.config.maxTokens || 4000,
          temperature: 0.1, // Lower temperature for more deterministic code generation
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new ProviderError('Empty response from OpenAI', this.name);
        }

        return content;
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after'])
            : undefined;
          throw new ProviderRateLimitError(this.name, retryAfter);
        }

        if (error.status === 402 || error.code === 'insufficient_quota') {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `OpenAI API error: ${error.message}`,
          this.name,
          error.code
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

Please provide:
1. A summary of the test quality assessment
2. Root causes of quality issues
3. Prioritized suggestions for improvement
4. Confidence in your assessment (0-1)
5. Specific code improvements if applicable
6. Research queries for deeper investigation

Format your response as JSON with these fields:
- summary: string
- rootCause: string
- suggestions: string[]
- confidence: number
- fixCode?: string
- researchQueries?: string[]
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
}
