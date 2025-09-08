import {
  AIProvider,
  AIAnalysisResult,
  VisualAnalysisResult,
  AnalysisContext,
  ProviderError,
  ProviderRateLimitError,
  ProviderQuotaError,
} from './providers/base.js';
import {
  ProviderFactory,
  ProviderType,
  ProviderFactoryConfig,
} from './providers/factory.js';
import { ErrorAnalysis, TestValidationResult } from '../types/analysis.js';

export interface CoordinatorConfig {
  providers: ProviderFactoryConfig;
  fallbackOrder?: ProviderType[];
  maxRetries?: number;
  retryDelay?: number;
  loadBalancing?: boolean;
  costOptimization?: boolean;
}

export interface AnalysisOptions {
  preferredProvider?: ProviderType;
  fallbackEnabled?: boolean;
  maxProviders?: number;
}

/**
 * Coordinates multiple AI providers for analysis tasks
 */
export class AICoordinator {
  private factory: ProviderFactory;
  private config: CoordinatorConfig;

  constructor(config: CoordinatorConfig) {
    this.config = {
      fallbackOrder: ['openai', 'anthropic', 'google'],
      maxRetries: 3,
      retryDelay: 1000,
      loadBalancing: false,
      costOptimization: true,
      ...config,
    };

    this.factory = ProviderFactory.getInstance(config.providers);
  }

  /**
   * Analyze error with automatic provider selection and fallback
   */
  async analyzeError(
    error: ErrorAnalysis,
    context: AnalysisContext,
    options: AnalysisOptions = {}
  ): Promise<AIAnalysisResult> {
    const providers = await this.selectProviders(options);

    if (providers.length === 0) {
      throw new Error('No AI providers available for error analysis');
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(
          `Attempting error analysis with ${provider.displayName}...`
        );
        const result = await this.withRetry(
          () => provider.analyzeError(error, context),
          provider.name
        );

        console.log(
          `✅ Error analysis completed successfully with ${provider.displayName}`
        );
        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `❌ Error analysis failed with ${provider.displayName}: ${err.message}`
        );

        // If rate limited, try next provider immediately
        if (err instanceof ProviderRateLimitError) {
          console.log(
            `⏳ Rate limited on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        // If quota exceeded, try next provider
        if (err instanceof ProviderQuotaError) {
          console.log(
            `💰 Quota exceeded on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        // For other errors, still try next provider but log the issue
        console.log(`🔄 Falling back to next provider due to: ${err.message}`);
      }
    }

    throw new Error(
      `All AI providers failed for error analysis. Last error: ${lastError?.message}`
    );
  }

  /**
   * Analyze visual elements with automatic provider selection and fallback
   */
  async analyzeVisual(
    screenshot: Buffer,
    context: AnalysisContext,
    options: AnalysisOptions = {}
  ): Promise<VisualAnalysisResult> {
    const providers = await this.selectProviders(options);

    if (providers.length === 0) {
      throw new Error('No AI providers available for visual analysis');
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(
          `Attempting visual analysis with ${provider.displayName}...`
        );
        const result = await this.withRetry(
          () => provider.analyzeVisual(screenshot, context),
          provider.name
        );

        console.log(
          `✅ Visual analysis completed successfully with ${provider.displayName}`
        );
        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `❌ Visual analysis failed with ${provider.displayName}: ${err.message}`
        );

        if (err instanceof ProviderRateLimitError) {
          console.log(
            `⏳ Rate limited on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        if (err instanceof ProviderQuotaError) {
          console.log(
            `💰 Quota exceeded on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        console.log(`🔄 Falling back to next provider due to: ${err.message}`);
      }
    }

    throw new Error(
      `All AI providers failed for visual analysis. Last error: ${lastError?.message}`
    );
  }

  /**
   * Validate test results with automatic provider selection and fallback
   */
  async validateTest(
    result: TestValidationResult,
    context: AnalysisContext,
    options: AnalysisOptions = {}
  ): Promise<AIAnalysisResult> {
    const providers = await this.selectProviders(options);

    if (providers.length === 0) {
      throw new Error('No AI providers available for test validation');
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(
          `Attempting test validation with ${provider.displayName}...`
        );
        const analysisResult = await this.withRetry(
          () => provider.validateTest(result, context),
          provider.name
        );

        console.log(
          `✅ Test validation completed successfully with ${provider.displayName}`
        );
        return analysisResult;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `❌ Test validation failed with ${provider.displayName}: ${err.message}`
        );

        if (err instanceof ProviderRateLimitError) {
          console.log(
            `⏳ Rate limited on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        if (err instanceof ProviderQuotaError) {
          console.log(
            `💰 Quota exceeded on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        console.log(`🔄 Falling back to next provider due to: ${err.message}`);
      }
    }

    throw new Error(
      `All AI providers failed for test validation. Last error: ${lastError?.message}`
    );
  }

  /**
   * Generate code fix with automatic provider selection and fallback
   */
  async generateFix(
    analysis: AIAnalysisResult,
    context: AnalysisContext,
    options: AnalysisOptions = {}
  ): Promise<string> {
    const providers = await this.selectProviders(options);

    if (providers.length === 0) {
      throw new Error('No AI providers available for fix generation');
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(
          `Attempting fix generation with ${provider.displayName}...`
        );
        const fixCode = await this.withRetry(
          () => provider.generateFix(analysis, context),
          provider.name
        );

        console.log(
          `✅ Fix generation completed successfully with ${provider.displayName}`
        );
        return fixCode;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `❌ Fix generation failed with ${provider.displayName}: ${err.message}`
        );

        if (err instanceof ProviderRateLimitError) {
          console.log(
            `⏳ Rate limited on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        if (err instanceof ProviderQuotaError) {
          console.log(
            `💰 Quota exceeded on ${provider.displayName}, trying next provider...`
          );
          continue;
        }

        console.log(`🔄 Falling back to next provider due to: ${err.message}`);
      }
    }

    throw new Error(
      `All AI providers failed for fix generation. Last error: ${lastError?.message}`
    );
  }

  /**
   * Get status of all configured providers
   */
  async getProviderStatus(): Promise<
    Record<ProviderType, { available: boolean; configured: boolean }>
  > {
    return this.factory.getProviderStats();
  }

  /**
   * Check if any providers are available
   */
  async hasAvailableProviders(): Promise<boolean> {
    return this.factory.hasAvailableProviders();
  }

  /**
   * Select providers based on options and configuration
   */
  private async selectProviders(
    options: AnalysisOptions
  ): Promise<AIProvider[]> {
    const providers: AIProvider[] = [];

    // If specific provider is preferred, try it first
    if (options.preferredProvider) {
      const provider = await this.factory.getProvider(
        options.preferredProvider
      );
      if (provider && (await provider.isAvailable())) {
        providers.push(provider);
      }
    }

    // If fallback is disabled, return only preferred provider
    if (options.fallbackEnabled === false) {
      return providers;
    }

    // Add fallback providers
    for (const providerType of this.config.fallbackOrder || []) {
      // Skip if already added
      if (providers.some((p) => p.name === providerType)) {
        continue;
      }

      const provider = await this.factory.getProvider(providerType);
      if (provider && (await provider.isAvailable())) {
        providers.push(provider);

        // Respect max providers limit
        if (options.maxProviders && providers.length >= options.maxProviders) {
          break;
        }
      }
    }

    return providers;
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    providerName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= (this.config.maxRetries || 3); attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on rate limits or quota errors
        if (
          error instanceof ProviderRateLimitError ||
          error instanceof ProviderQuotaError
        ) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay =
          (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * delay;
        const totalDelay = delay + jitter;

        console.log(
          `🔄 Retrying ${providerName} in ${Math.round(totalDelay)}ms (attempt ${attempt}/${this.config.maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError!;
  }
}

/**
 * Create a default AI coordinator instance
 */
export function createAICoordinator(config: CoordinatorConfig): AICoordinator {
  return new AICoordinator(config);
}
