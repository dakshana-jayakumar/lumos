import { GoogleGenerativeAI } from '@google/generative-ai';
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

export interface GoogleConfig extends ProviderConfig {
  model?: string;
}

export class GoogleProvider extends BaseAIProvider {
  readonly name = 'google';
  readonly displayName = 'Google Gemini';

  private client: GoogleGenerativeAI | null = null;
  private googleConfig: GoogleConfig;

  constructor(config: GoogleConfig = {}) {
    super(config);
    this.googleConfig = {
      model: 'gemini-1.5-pro',
      ...config,
    };

    if (this.googleConfig.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    this.client = new GoogleGenerativeAI(this.googleConfig.apiKey || '');
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.googleConfig.apiKey) {
        return false;
      }

      if (!this.client) {
        this.initializeClient();
      }

      // Test with a simple API call
      const model = this.client!.getGenerativeModel({
        model: this.googleConfig.model!,
      });
      await model.generateContent('Hello');
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
      throw new ProviderError('Google client not initialized', this.name);
    }

    const prompt = this.createErrorAnalysisPrompt(error, context);

    return this.withRetry(async () => {
      try {
        const model = this.client!.getGenerativeModel({
          model: this.googleConfig.model!,
          generationConfig: {
            temperature: this.config.temperature || 0.3,
            maxOutputTokens: this.config.maxTokens || 4000,
          },
        });

        const systemPrompt =
          'You are an expert software testing engineer. Always respond with valid JSON only, no additional text or formatting.';
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
          throw new ProviderError('Empty response from Google', this.name);
        }

        // Clean the response to extract JSON
        const jsonText = this.extractJSON(content);
        return JSON.parse(jsonText) as AIAnalysisResult;
      } catch (error: any) {
        if (error.status === 429 || error.message?.includes('quota')) {
          throw new ProviderRateLimitError(this.name);
        }

        if (error.status === 402 || error.message?.includes('billing')) {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Google API error: ${error.message}`,
          this.name,
          error.status?.toString() || 'unknown'
        );
      }
    });
  }

  async analyzeVisual(
    screenshot: Buffer,
    context: AnalysisContext
  ): Promise<VisualAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('Google client not initialized', this.name);
    }

    const prompt = this.createVisualAnalysisPrompt(context);

    return this.withRetry(async () => {
      try {
        const model = this.client!.getGenerativeModel({
          model: this.googleConfig.model!,
          generationConfig: {
            temperature: this.config.temperature || 0.3,
            maxOutputTokens: this.config.maxTokens || 4000,
          },
        });

        const systemPrompt =
          'You are an expert UI/UX tester. Always respond with valid JSON only, no additional text or formatting.';
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        const imagePart = {
          inlineData: {
            data: screenshot.toString('base64'),
            mimeType: 'image/png',
          },
        };

        const result = await model.generateContent([fullPrompt, imagePart]);
        const response = result.response;
        const content = response.text();

        if (!content) {
          throw new ProviderError(
            'Empty response from Google Vision',
            this.name
          );
        }

        // Clean the response to extract JSON
        const jsonText = this.extractJSON(content);
        return JSON.parse(jsonText) as VisualAnalysisResult;
      } catch (error: any) {
        if (error.status === 429 || error.message?.includes('quota')) {
          throw new ProviderRateLimitError(this.name);
        }

        if (error.status === 402 || error.message?.includes('billing')) {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Google Vision API error: ${error.message}`,
          this.name,
          error.status?.toString() || 'unknown'
        );
      }
    });
  }

  async validateTest(
    result: TestValidationResult,
    context: AnalysisContext
  ): Promise<AIAnalysisResult> {
    if (!this.client) {
      throw new ProviderError('Google client not initialized', this.name);
    }

    const prompt = this.createTestValidationPrompt(result, context);

    return this.withRetry(async () => {
      try {
        const model = this.client!.getGenerativeModel({
          model: this.googleConfig.model!,
          generationConfig: {
            temperature: this.config.temperature || 0.3,
            maxOutputTokens: this.config.maxTokens || 4000,
          },
        });

        const systemPrompt =
          'You are an expert software testing engineer specializing in test quality assessment. Always respond with valid JSON only, no additional text or formatting.';
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
          throw new ProviderError('Empty response from Google', this.name);
        }

        // Clean the response to extract JSON
        const jsonText = this.extractJSON(content);
        return JSON.parse(jsonText) as AIAnalysisResult;
      } catch (error: any) {
        if (error.status === 429 || error.message?.includes('quota')) {
          throw new ProviderRateLimitError(this.name);
        }

        if (error.status === 402 || error.message?.includes('billing')) {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Google API error: ${error.message}`,
          this.name,
          error.status?.toString() || 'unknown'
        );
      }
    });
  }

  async generateFix(
    analysis: AIAnalysisResult,
    context: AnalysisContext
  ): Promise<string> {
    if (!this.client) {
      throw new ProviderError('Google client not initialized', this.name);
    }

    const prompt = this.createFixGenerationPrompt(analysis, context);

    return this.withRetry(async () => {
      try {
        const model = this.client!.getGenerativeModel({
          model: this.googleConfig.model!,
          generationConfig: {
            temperature: 0.1, // Lower temperature for more deterministic code generation
            maxOutputTokens: this.config.maxTokens || 4000,
          },
        });

        const systemPrompt =
          'You are an expert software engineer specializing in test automation and bug fixes. Provide clean, production-ready code with clear explanations.';
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
          throw new ProviderError('Empty response from Google', this.name);
        }

        return content;
      } catch (error: any) {
        if (error.status === 429 || error.message?.includes('quota')) {
          throw new ProviderRateLimitError(this.name);
        }

        if (error.status === 402 || error.message?.includes('billing')) {
          throw new ProviderQuotaError(this.name);
        }

        if (error instanceof ProviderError) {
          throw error;
        }

        throw new ProviderError(
          `Google API error: ${error.message}`,
          this.name,
          error.status?.toString() || 'unknown'
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
   * Extract JSON from Google's response which might include additional text
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
