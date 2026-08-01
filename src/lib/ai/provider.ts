import type { AIProviderConfig } from '@shared/index'
import type { AIProvider } from './types'
import { createOpenAIProvider } from './openai'
import { createAnthropicProvider } from './anthropic'
import { createDeepSeekProvider } from './deepseek'

export function createProvider(config: AIProviderConfig): AIProvider {
  if (!config.apiKey) {
    throw new Error('未配置 API Key，请先在设置中填写')
  }

  switch (config.provider) {
    case 'openai':
      return createOpenAIProvider(config)
    case 'anthropic':
      return createAnthropicProvider(config)
    case 'deepseek':
      return createDeepSeekProvider(config)
    case 'custom':
      // 自定义服务没有官方默认地址，留空会误打到 OpenAI/Anthropic 官方接口，必须要求填 Base URL
      if (!config.baseUrl?.trim()) {
        throw new Error('自定义服务需要填写 Base URL')
      }
      // 第三方/自定义服务没有固定协议，由用户在设置里选择这家第三方实际兼容的是 OpenAI 协议还是 Anthropic 协议
      return config.protocol === 'anthropic' ? createAnthropicProvider(config) : createOpenAIProvider(config)
    default:
      throw new Error(`不支持的 AI provider: ${config.provider}`)
  }
}
