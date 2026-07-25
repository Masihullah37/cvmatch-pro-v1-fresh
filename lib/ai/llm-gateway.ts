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

  // try {
  //   // Attempt Primary
  //   return await executeGenerate(primaryConfig);
  // } catch (error: any) {
  //   console.warn(`Primary LLM failed (${primaryConfig.provider}):`, error.message);

  //   // Attempt Fallback
  //   if (fallbackConfig.apiKey && fallbackConfig.provider) {
  //     console.log(`Triggering Fallback LLM (${fallbackConfig.provider})...`);
  //     try {
  //       return await executeGenerate(fallbackConfig);
  //     } catch (fallbackError: any) {
  //       console.error(`Fallback LLM also failed:`, fallbackError.message);
  //       throw fallbackError;
  //     }
  //   }

  //   throw error;
  // }

  try {
    // Attempt Primary
    return await executeWithRetry(primaryConfig);
  } catch (error: any) {
    console.warn(`Primary LLM failed (${primaryConfig.provider}):`, error.message);

    // Attempt Fallback
    if (fallbackConfig.apiKey && fallbackConfig.provider) {
      console.log(`Triggering Fallback LLM (${fallbackConfig.provider})...`);
      try {
        return await executeWithRetry(fallbackConfig);
      } catch (fallbackError: any) {
        console.error(`Fallback LLM also failed:`, fallbackError.message);
        throw fallbackError;
      }
    }

    throw error;
  }

  async function executeWithRetry(config: LLMConfig, attempts = 2): Promise<string> {
    let lastError: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await executeGenerate(config);
      } catch (error: any) {
        lastError = error;
        const isTransient = /high demand|rate limit|overloaded|503|429/i.test(error.message || "");
        if (!isTransient || i === attempts - 1) throw error;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // 1s, then 2s
      }
    }
    throw lastError;
  }

  async function executeGenerate(config: LLMConfig) {
    const model = getModel(config);
    console.log("Using model:", config.model);
    console.log("Prompt length (chars):", prompt.length);

    // Groq free tier: ~8000 TPM (input + output combined).
    // With compacted prompts (~2000-3000 chars / ~800-1000 tokens input),
    // we have room for 2500 output tokens.
    // Google / Anthropic / OpenAI use the full maxTokens unchanged.

    // const effectiveMaxTokens =
    //   config.provider.toLowerCase() === "groq"
    //     ? Math.min(maxTokens, 2500)
    //     : maxTokens;



    // Provider-specific output token limits:
    //
    // GROQ (openai/gpt-oss-120b):
    //   8000 TPM combined (input + output)
    //   Cap output at 2500 → leaves room for input tokens
    //
    // GOOGLE (gemini-3.5-flash):
    //   THINKING model — consumes hidden reasoning tokens
    //   BEFORE generating output. Observed: 3836 thinking
    //   tokens used internally, leaving only 160 for JSON
    //   → JSON truncated → blank CV.
    //   Fix: give 8192 so thinking(3836) + output(4356) fit.
    //
    // OPENAI / ANTHROPIC: standard models, use maxTokens as-is
    const effectiveMaxTokens =
      config.provider.toLowerCase() === "groq"
        ? Math.min(maxTokens, 6000)
        : config.provider.toLowerCase() === "google"
          ? 8192
          : maxTokens;

    const result = await generateText({
      model,
      system,
      prompt,
      temperature,
      maxOutputTokens: effectiveMaxTokens,
    });

    console.log("Finish reason:", result.finishReason);
    console.log("Usage:", result.usage);

    // Guard: if the model ran out of tokens the JSON will be truncated.
    // Throw immediately so the fallback LLM is triggered instead of
    // passing a broken partial response to the JSON parser.
    if (result.finishReason === "length") {
      throw new Error(
        `Model ${config.model} hit token limit (finish_reason=length). Prompt may be too long.`
      );
    }

    const text = result.text;

    // Strip reasoning blocks from thinking models.
    // openai/gpt-oss-120b outputs <think>...</think> before JSON.
    // Must strip BEFORE passing to JSON parser.
    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
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
