import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { generateText, type LanguageModel } from 'ai';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'groq';

interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
}

function getModel(config: LLMConfig): LanguageModel {
  const { provider, model, apiKey } = config;

  switch (provider.toLowerCase()) {
    case 'openai':
      return createOpenAI({ apiKey })(model);
    case 'anthropic':
      return createAnthropic({ apiKey })(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(model);
    case 'groq':
      return createGroq({ apiKey })(model);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export async function generateLLMResponse({
  prompt,
  system,
  temperature = 0.1,
  maxTokens = 3000,
  responseFormat = 'text',
}: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}) {
  const primaryConfig: LLMConfig = {
    provider: process.env.PRIMARY_LLM_PROVIDER || 'groq',
    model: process.env.PRIMARY_LLM_MODEL || 'llama-3.3-70b-versatile',
    apiKey: process.env.PRIMARY_LLM_API_KEY || process.env.GROQ_API_KEY || '',
  };

  console.log("PRIMARY MODEL:", primaryConfig.model);

  const fallbackConfig: LLMConfig = {
    provider: process.env.FALLBACK_LLM_PROVIDER || 'google',
    model: process.env.FALLBACK_LLM_MODEL || 'gemini-1.5-flash',
    apiKey: process.env.FALLBACK_LLM_API_KEY || '',
  };

  try {
    // Attempt Primary
    return await executeGenerate(primaryConfig);
  } catch (error: any) {
    console.warn(`Primary LLM failed (${primaryConfig.provider}):`, error.message);

    // Attempt Fallback
    if (fallbackConfig.apiKey && fallbackConfig.provider) {
      console.log(`Triggering Fallback LLM (${fallbackConfig.provider})...`);
      try {
        return await executeGenerate(fallbackConfig);
      } catch (fallbackError: any) {
        console.error(`Fallback LLM also failed:`, fallbackError.message);
        throw fallbackError;
      }
    }

    throw error;
  }

  // async function executeGenerate(config: LLMConfig) {
  //   const model = getModel(config);
  //   const { text } = await generateText({
  //     model,
  //     system,
  //     prompt,
  //     temperature,
  //     maxOutputTokens: maxTokens,
  //   });
  //   return text;
  // }

  async function executeGenerate(config: LLMConfig) {
    const model = getModel(config);
    console.log("Using model:", config.model);

    // For Qwen3 models: append /no_think to prompt to disable
    // reasoning mode and get clean JSON output directly.
    // This prevents <think>...</think> blocks in JSON responses.
    //   const isQwen3 = config.model.includes("qwen3") || config.model.includes("qwen/qwen3");
    //   const finalPrompt = isQwen3 ? `${prompt} /no_think` : prompt;

    //   const { text } = await generateText({
    //     model,
    //     system,
    //     prompt: finalPrompt,
    //     temperature,
    //     maxOutputTokens: maxTokens,
    //   });

    //   // Strip any remaining <think> blocks just in case
    //   return text
    //     .replace(/<think>[\s\S]*?<\/think>/gi, "")
    //     .replace(/<thinking>[\s\S]*?<\/antml:thinking>/gi, "")
    //     .trim();


    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature,
      maxOutputTokens: maxTokens,
    });

    return text.trim();
  }


}
