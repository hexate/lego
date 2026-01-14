import { LDRAW_SYSTEM_PROMPT, buildPrompt } from './systemPrompt';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: 'text'; text: string }>;
  error?: { message: string };
}

export class LLMClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateLDraw(userPrompt: string): Promise<string> {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: buildPrompt(userPrompt),
      },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: LDRAW_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as AnthropicResponse).error?.message ||
          `API request failed: ${response.status}`
      );
    }

    const data = (await response.json()) as AnthropicResponse;

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from API');
    }

    const ldrawContent = data.content[0].text;

    // Clean up the response - remove markdown code blocks if present
    return this.cleanLDrawResponse(ldrawContent);
  }

  private cleanLDrawResponse(text: string): string {
    // Remove markdown code blocks if the model wrapped them
    let cleaned = text.trim();

    // Remove ```ldraw or ``` markers
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:ldraw|ldr)?\n?/, '');
      cleaned = cleaned.replace(/\n?```$/, '');
    }

    return cleaned.trim();
  }
}
