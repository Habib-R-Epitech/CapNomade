import 'server-only';
import { serverEnv } from '@/lib/env';

export interface DestinationInsightsPayload {
  destination: string;
  generated_at: string;
  is_generated: true;
  sections: {
    culinary: string[];
    must_see: string[];
    neighborhoods: string[];
    good_to_know: string[];
    transport: string[];
    weather: string[];
    budget: string;
    cultural_rules: string[];
    practical_checklist: string[];
    activities: string[];
  };
}

export interface InsightsProvider {
  available: boolean;
  generate(destination: string): Promise<DestinationInsightsPayload>;
}

class DisabledProvider implements InsightsProvider {
  available = false;
  async generate(destination: string): Promise<DestinationInsightsPayload> {
    return emptyPayload(destination);
  }
}

class OpenAIProvider implements InsightsProvider {
  available = true;
  constructor(private apiKey: string) {}
  async generate(destination: string): Promise<DestinationInsightsPayload> {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: insightsPrompt(destination),
        response_format: { type: 'json_object' },
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`OpenAI insights failed: ${res.status}`);
    const json = (await res.json()) as { output_text?: string };
    const raw = json.output_text ?? '{}';
    let parsed: Partial<DestinationInsightsPayload['sections']>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    return {
      destination,
      generated_at: new Date().toISOString(),
      is_generated: true,
      sections: { ...emptyPayload(destination).sections, ...parsed },
    };
  }
}

export function getInsightsProvider(): InsightsProvider {
  const env = serverEnv();
  if (env.INSIGHTS_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return new OpenAIProvider(env.OPENAI_API_KEY);
  }
  return new DisabledProvider();
}

function emptyPayload(destination: string): DestinationInsightsPayload {
  return {
    destination,
    generated_at: new Date().toISOString(),
    is_generated: true,
    sections: {
      culinary: [],
      must_see: [],
      neighborhoods: [],
      good_to_know: [],
      transport: [],
      weather: [],
      budget: '',
      cultural_rules: [],
      practical_checklist: [],
      activities: [],
    },
  };
}

function insightsPrompt(destination: string): string {
  return `Tu es un guide de voyage expérimenté. Pour la destination "${destination}", produis un JSON strict avec les clés suivantes (toutes en français, listes de strings concises) : culinary, must_see, neighborhoods, good_to_know, transport, weather, cultural_rules, practical_checklist, activities ; et la clé "budget" en string. Pas d'autre texte que le JSON.`;
}
