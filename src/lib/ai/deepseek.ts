import type { AIProviderConfig } from '@shared/index'
import type { AIProvider } from './types'
import { createOpenAIProvider } from './openai'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'

export function createDeepSeekProvider(config: AIProviderConfig): AIProvider {
  return createOpenAIProvider({
    ...config,
    baseUrl: config.baseUrl || DEEPSEEK_BASE_URL,
    model: config.model || DEFAULT_MODEL
  })
}
