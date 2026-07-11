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
  //   console.log("Using model:", config.model);


  //   // const { text } = await generateText({
  //   //   model,
  //   //   system,
  //   //   prompt,
  //   //   temperature,
  //   //   maxOutputTokens: maxTokens,
  //   // });

  //   const { text } = await generateText({
  //     model,
  //     system,
  //     prompt,
  //     temperature,
  //     maxOutputTokens:
  //       config.provider.toLowerCase() === "groq"
  //         ? Math.min(maxTokens, 1800)
  //         : maxTokens,
  //   });

  //   return text.trim();
  // }

  async function executeGenerate(config: LLMConfig) {
    const model = getModel(config);
    console.log("Using model:", config.model);

    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature,
      // Cap Groq output tokens to stay within free tier TPM limit.
      // openai/gpt-oss-120b: 8000 TPM = input + output combined.
      // Capping output at 1800 leaves ~6200 tokens for input.
      // Google/Anthropic/OpenAI get full maxTokens unchanged.
      maxOutputTokens:
        config.provider.toLowerCase() === "groq"
          ? Math.min(maxTokens, 1800)
          : maxTokens,
    });

    // Strip reasoning blocks from thinking models.
    // openai/gpt-oss-120b outputs <think>...</think> before JSON.
    // Must strip BEFORE passing to JSON parser or it grabs
    // wrong { } characters from inside the reasoning block.
    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<thinking>[\s\S]*?<\/antml:thinking>/gi, "")
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
      .trim();

    console.log(
      `[LLM] ${config.model} | raw: ${text.length} chars | cleaned: ${cleaned.length} chars`
    );

    if (!cleaned) {
      throw new Error(
        `Model ${config.model} returned empty response after reasoning strip`
      );
    }

    return cleaned;
  }


}
