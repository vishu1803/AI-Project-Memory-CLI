import axios from 'axios';

export async function askAI(prompt: string, systemMessage?: string): Promise<string> {
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

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

    try {
        const response = await axios.post(
            `${baseUrl}/chat/completions`,
            {
                model,
                messages,
                temperature: 0.3,
                max_tokens: 4096,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60_000,
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
            const msg = error.response?.data?.error?.message || error.message;
            throw new Error(`AI API error (${status}): ${msg}`);
        }
        throw error;
    }
}
