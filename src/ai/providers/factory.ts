import { AIProvider, ProviderConfig } from './base.js';
import { OpenAIProvider, OpenAIConfig } from './openai.js';
import { AnthropicProvider, AnthropicConfig } from './anthropic.js';
import { GoogleProvider, GoogleConfig } from './google.js';

export type ProviderType = 'openai' | 'anthropic' | 'google';

export interface ProviderFactoryConfig {
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  google?: GoogleConfig;
}

/**
 * Factory for creating AI provider instances
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers: Map<ProviderType, AIProvider> = new Map();
  private config: ProviderFactoryConfig;

  private constructor(config: ProviderFactoryConfig = {}) {
    this.config = config;
  }

  static getInstance(config?: ProviderFactoryConfig): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory(config);
    } else if (config) {
      ProviderFactory.instance.updateConfig(config);
    }
    return ProviderFactory.instance;
  }

  updateConfig(config: ProviderFactoryConfig): void {
    this.config = { ...this.config, ...config };
    // Clear cached providers to force recreation with new config
    this.providers.clear();
  }

  /**
   * Create or get cached provider instance
   */
  async getProvider(type: ProviderType): Promise<AIProvider | null> {
    if (this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    const provider = await this.createProvider(type);
    if (provider) {
      this.providers.set(type, provider);
    }

    return provider;
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<AIProvider[]> {
    const providers: AIProvider[] = [];
    const types: ProviderType[] = ['openai', 'anthropic', 'google'];

    for (const type of types) {
      const provider = await this.getProvider(type);
      if (provider && (await provider.isAvailable())) {
        providers.push(provider);
      }
    }

    return providers;
  }

  /**
   * Get preferred provider based on availability and configuration
   */
  async getPreferredProvider(
    preferredTypes?: ProviderType[]
  ): Promise<AIProvider | null> {
    const types = preferredTypes || ['openai', 'anthropic', 'google'];

    for (const type of types) {
      const provider = await this.getProvider(type);
      if (provider && (await provider.isAvailable())) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Check if any providers are available
   */
  async hasAvailableProviders(): Promise<boolean> {
    const providers = await this.getAvailableProviders();
    return providers.length > 0;
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<
    Record<ProviderType, { available: boolean; configured: boolean }>
  > {
    const stats: Record<
      ProviderType,
      { available: boolean; configured: boolean }
    > = {
      openai: { available: false, configured: false },
      anthropic: { available: false, configured: false },
      google: { available: false, configured: false },
    };

    for (const type of Object.keys(stats) as ProviderType[]) {
      const provider = await this.getProvider(type);
      stats[type].configured = !!provider;
      stats[type].available = provider ? await provider.isAvailable() : false;
    }

    return stats;
  }

  private async createProvider(type: ProviderType): Promise<AIProvider | null> {
    switch (type) {
      case 'openai': {
        const apiKey = this.config.openai?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return null;
        }
        return new OpenAIProvider({
          ...this.config.openai,
          apiKey,
        });
      }

      case 'anthropic': {
        const apiKey =
          this.config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return null;
        }
        return new AnthropicProvider({
          ...this.config.anthropic,
          apiKey,
        });
      }

      case 'google': {
        const apiKey = this.config.google?.apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          return null;
        }
        return new GoogleProvider({
          ...this.config.google,
          apiKey,
        });
      }

      default:
        return null;
    }
  }

  /**
   * Reset the factory instance (useful for testing)
   */
  static reset(): void {
    ProviderFactory.instance = undefined as any;
  }
}

/**
 * Convenience function to get a provider
 */
export async function getProvider(
  type: ProviderType,
  config?: ProviderFactoryConfig
): Promise<AIProvider | null> {
  const factory = ProviderFactory.getInstance(config);
  return factory.getProvider(type);
}

/**
 * Convenience function to get the best available provider
 */
export async function getBestProvider(
  config?: ProviderFactoryConfig,
  preferredTypes?: ProviderType[]
): Promise<AIProvider | null> {
  const factory = ProviderFactory.getInstance(config);
  return factory.getPreferredProvider(preferredTypes);
}

/**
 * Convenience function to get all available providers
 */
export async function getAvailableProviders(
  config?: ProviderFactoryConfig
): Promise<AIProvider[]> {
  const factory = ProviderFactory.getInstance(config);
  return factory.getAvailableProviders();
}
