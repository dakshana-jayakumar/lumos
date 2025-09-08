import {
  ErrorAnalysis,
  VisualAnalysis,
  TestValidationResult,
} from '../../types/analysis.js';

/**
 * Context information for AI analysis
 */
export interface AnalysisContext {
  testFile?: string;
  projectRoot: string;
  browserContext?: {
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
  };
  errorContext?: {
    stackTrace?: string;
    browserLogs?: string[];
    networkLogs?: string[];
  };
}

/**
 * AI analysis result from providers
 */
export interface AIAnalysisResult {
  summary: string;
  rootCause: string;
  suggestions: string[];
  confidence: number; // 0-1
  fixCode?: string;
  researchQueries?: string[];
}

/**
 * Visual analysis result from AI providers
 */
export interface VisualAnalysisResult {
  description: string;
  elements: Array<{
    type: string;
    description: string;
    bounds?: { x: number; y: number; width: number; height: number };
  }>;
  issues: string[];
  suggestions: string[];
  confidence: number; // 0-1
}

/**
 * Base interface for AI providers
 */
export interface AIProvider {
  /** Provider name for identification */
  readonly name: string;

  /** Provider display name */
  readonly displayName: string;

  /** Check if provider is available and configured */
  isAvailable(): Promise<boolean>;

  /** Analyze error and provide insights */
  analyzeError(
    error: ErrorAnalysis,
    context: AnalysisContext
  ): Promise<AIAnalysisResult>;

  /** Analyze visual elements in screenshots */
  analyzeVisual(
    screenshot: Buffer,
    context: AnalysisContext
  ): Promise<VisualAnalysisResult>;

  /** Validate test results and suggest improvements */
  validateTest(
    result: TestValidationResult,
    context: AnalysisContext
  ): Promise<AIAnalysisResult>;

  /** Generate code fixes based on analysis */
  generateFix(
    analysis: AIAnalysisResult,
    context: AnalysisContext
  ): Promise<string>;
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retries?: number;
}

/**
 * Base abstract class for AI providers
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      maxTokens: 4000,
      temperature: 0.3,
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  abstract isAvailable(): Promise<boolean>;
  abstract analyzeError(
    error: ErrorAnalysis,
    context: AnalysisContext
  ): Promise<AIAnalysisResult>;
  abstract analyzeVisual(
    screenshot: Buffer,
    context: AnalysisContext
  ): Promise<VisualAnalysisResult>;
  abstract validateTest(
    result: TestValidationResult,
    context: AnalysisContext
  ): Promise<AIAnalysisResult>;
  abstract generateFix(
    analysis: AIAnalysisResult,
    context: AnalysisContext
  ): Promise<string>;

  /**
   * Retry mechanism for API calls
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.config.retries || 3
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (i === retries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Create standardized prompt for error analysis
   */
  protected createErrorAnalysisPrompt(
    error: ErrorAnalysis,
    context: AnalysisContext
  ): string {
    return `
You are an expert software testing engineer analyzing a test failure. Provide a comprehensive analysis.

## Error Details:
- Category: ${error.category}
- Message: ${error.context.errorMessage}
- Confidence: ${error.confidence}

## Stack Trace:
${error.context.stackTrace || 'Not available'}

## File Context:
- File: ${error.context.filePath || context.testFile || 'Unknown'}
- Line: ${error.context.lineNumber || 'Unknown'}
- Code Context: ${error.context.codeContext || 'Not available'}

## Test Context:
- Project Root: ${context.projectRoot}
${
  context.browserContext
    ? `
- Browser URL: ${context.browserContext.url}
- Viewport: ${context.browserContext.viewport.width}x${context.browserContext.viewport.height}
`
    : ''
}

## Environment:
${
  error.context.environment
    ? `
- Node Version: ${error.context.environment.nodeVersion || 'Unknown'}
- Platform: ${error.context.environment.platform || 'Unknown'}
- Framework: ${error.context.environment.framework || 'Unknown'}
- Environment: ${error.context.environment.environment || 'Unknown'}
`
    : 'Not available'
}

## Additional Context:
${
  context.errorContext?.browserLogs?.length
    ? `
Browser Logs:
${context.errorContext.browserLogs.join('\n')}
`
    : ''
}

${
  context.errorContext?.networkLogs?.length
    ? `
Network Logs:
${context.errorContext.networkLogs.join('\n')}
`
    : ''
}

## Existing Suggestions:
${error.suggestions.length ? error.suggestions.join('\n- ') : 'None'}

## Pattern Information:
${
  error.pattern
    ? `
- Pattern ID: ${error.pattern.id}
- Pattern: ${error.pattern.pattern}
- Frequency: ${error.pattern.frequency}
- Last Seen: ${error.pattern.lastSeen}
`
    : 'No pattern identified'
}

Please provide:
1. A clear summary of what went wrong
2. The likely root cause of the failure
3. Specific suggestions to fix the issue
4. Your confidence level (0-1) in this analysis
5. If possible, provide code to fix the issue
6. Suggest relevant research queries for deeper investigation

Format your response as JSON with these fields:
- summary: string
- rootCause: string
- suggestions: string[]
- confidence: number
- fixCode?: string
- researchQueries?: string[]
`.trim();
  }

  /**
   * Create standardized prompt for visual analysis
   */
  protected createVisualAnalysisPrompt(context: AnalysisContext): string {
    return `
You are an expert UI/UX tester analyzing a screenshot for testing issues.

## Context:
${
  context.browserContext
    ? `
- URL: ${context.browserContext.url}
- Viewport: ${context.browserContext.viewport.width}x${context.browserContext.viewport.height}
- User Agent: ${context.browserContext.userAgent}
`
    : ''
}

Analyze the screenshot and provide:
1. Description of what you see in the UI
2. Identify all visible elements and their purposes
3. Spot any visual issues or anomalies
4. Suggest improvements for testability
5. Your confidence level (0-1) in this analysis

Format your response as JSON with these fields:
- description: string
- elements: Array<{type: string, description: string, bounds?: {x, y, width, height}}>
- issues: string[]
- suggestions: string[]
- confidence: number
`.trim();
  }
}

/**
 * Provider error types
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  readonly retryAfter?: number;

  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT');
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

export class ProviderQuotaError extends ProviderError {
  constructor(provider: string) {
    super(`Quota exceeded for ${provider}`, provider, 'QUOTA_EXCEEDED');
  }
}
