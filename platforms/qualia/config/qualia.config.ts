/**
 * Qualia Solutions - VAPI Configuration
 *
 * Standard configuration for voice AI agents built for Qualia clients.
 * Uses Claude as the LLM provider with ElevenLabs for voice synthesis.
 */

export interface VapiConfig {
  name: string;
  description: string;
  model: ModelConfig;
  voice: VoiceConfig;
  transcriber: TranscriberConfig;
  settings: AgentSettings;
  functions?: FunctionDefinition[];
}

interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'groq';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface VoiceConfig {
  provider: 'elevenlabs' | 'playht' | 'deepgram' | 'azure';
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  optimizeStreamingLatency?: number;
}

interface TranscriberConfig {
  provider: 'deepgram' | 'assembly' | 'google';
  model: string;
  language: string;
  smartFormat?: boolean;
}

interface AgentSettings {
  firstMessage: string;
  silenceTimeoutSeconds: number;
  responseDelaySeconds: number;
  llmRequestDelaySeconds: number;
  numWordsToInterruptAssistant: number;
  endCallMessage?: string;
  voicemailMessage?: string;
  maxDurationSeconds?: number;
}

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Qualia Solutions Default Configuration
export const qualiaDefaultConfig: VapiConfig = {
  name: 'Qualia Voice Assistant',
  description: 'Professional voice assistant for Qualia Solutions clients',

  model: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 250,
    systemPrompt: `You are a professional voice assistant for a Qualia Solutions client.

Core behaviors:
- Be concise and conversational - this is voice, not text
- Keep responses under 2-3 sentences when possible
- Use natural speech patterns and occasional filler words sparingly
- Confirm important details before taking action
- Handle interruptions gracefully
- If you don't understand, ask for clarification

When the conversation ends:
- Summarize any actions taken
- Confirm next steps if applicable
- End warmly but professionally`,
  },

  voice: {
    provider: 'elevenlabs',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - professional male voice
    stability: 0.5,
    similarityBoost: 0.75,
    optimizeStreamingLatency: 1,
  },

  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
    smartFormat: true,
  },

  settings: {
    firstMessage: 'Hello! This is your assistant from {{company_name}}. How can I help you today?',
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 0.4,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 2,
    endCallMessage: 'Thank you for calling. Have a great day!',
    voicemailMessage: 'Hi, this is {{company_name}}. We missed your call. Please leave a message and we will get back to you shortly.',
    maxDurationSeconds: 1800, // 30 minutes max call
  },

  functions: [
    {
      name: 'transferCall',
      description: 'Transfer the call to a human agent or department',
      parameters: {
        type: 'object',
        properties: {
          department: {
            type: 'string',
            description: 'The department to transfer to',
            enum: ['sales', 'support', 'billing', 'general'],
          },
          reason: {
            type: 'string',
            description: 'Reason for the transfer',
          },
        },
        required: ['department'],
      },
    },
    {
      name: 'scheduleCallback',
      description: 'Schedule a callback for the customer',
      parameters: {
        type: 'object',
        properties: {
          phoneNumber: {
            type: 'string',
            description: 'Phone number to call back',
          },
          preferredTime: {
            type: 'string',
            description: 'Preferred callback time',
          },
          reason: {
            type: 'string',
            description: 'Reason for callback',
          },
        },
        required: ['phoneNumber', 'preferredTime'],
      },
    },
    {
      name: 'collectInfo',
      description: 'Collect and save customer information',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer name' },
          email: { type: 'string', description: 'Customer email' },
          phone: { type: 'string', description: 'Customer phone' },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['name'],
      },
    },
  ],
};

// Voice Options by Use Case
export const voiceProfiles = {
  professional: {
    // Adam - professional, trustworthy male
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    stability: 0.5,
    similarityBoost: 0.75,
  },
  friendly: {
    // Rachel - warm, friendly female
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    stability: 0.5,
    similarityBoost: 0.75,
  },
  energetic: {
    // Josh - energetic male
    voiceId: 'TxGEqnHWrfWFTfGW9XjX',
    stability: 0.4,
    similarityBoost: 0.8,
  },
  calm: {
    // Elli - calm, soothing female
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    stability: 0.6,
    similarityBoost: 0.7,
  },
  authoritative: {
    // Arnold - deep, authoritative male
    voiceId: 'VR6AewLTigWG4xSOukaG',
    stability: 0.6,
    similarityBoost: 0.75,
  },
};

// Model Options by Priority
export const modelProfiles = {
  quality: {
    // Best quality, higher latency
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 300,
  },
  balanced: {
    // Good balance
    provider: 'anthropic' as const,
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.7,
    maxTokens: 250,
  },
  speed: {
    // Fastest response
    provider: 'groq' as const,
    model: 'llama-3.1-70b-versatile',
    temperature: 0.7,
    maxTokens: 200,
  },
};

export default qualiaDefaultConfig;
