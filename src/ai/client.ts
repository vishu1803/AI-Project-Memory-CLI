import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000]; // ms — escalating backoff

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export type AIUsage = 'memory' | 'coding';

interface AskAIOptions {
    usage?: AIUsage;
    maxTokens?: number;
    temperature?: number;
}

function getModelForUsage(usage: AIUsage): string {
    if (usage === 'memory') {
        return process.env.AI_MEMORY_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
    }
    return process.env.AI_CODING_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
}

export async function askAI(prompt: string, systemMessage?: string, options: AskAIOptions = {}): Promise<string> {
    const apiKey = process.env.AI_API_KEY;
    const usage = options.usage || 'coding';
    const model = getModelForUsage(usage);
    const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const temperature = options.temperature ?? (usage === 'memory' ? 0.1 : 0.3);
    const maxTokens = options.maxTokens ?? (usage === 'memory' ? 1200 : 2048);

    if (!apiKey) {
        throw new Error(
            'AI_API_KEY is not set. Create a .env file with your API key.\n' +
            'See .env.example for the required format.',
        );
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
    }

    messages.push({ role: 'user', content: prompt });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await axios.post(
                `${baseUrl}/chat/completions`,
                {
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 300_000,
                },
            );

            const choice = response.data?.choices?.[0];
            if (!choice?.message?.content) {
                throw new Error('Empty response from AI API');
            }

            return choice.message.content.trim();
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;

                // Retry on 429 (rate limit) or 503 (overloaded)
                if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
                    const delay = RETRY_DELAYS[attempt] || 10000;
                    console.log(`  ⏳ Rate limited (${status}). Retrying in ${delay / 1000}s... (${attempt + 1}/${MAX_RETRIES})`);
                    await sleep(delay);
                    continue;
                }

                const msg = error.response?.data?.error?.message || error.message;
                throw new Error(`AI API error (${status}): ${msg}`);
            }
            throw error;
        }
    }

    throw new Error('Max retries exceeded');
}
