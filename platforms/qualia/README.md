# Qualia Solutions - VAPI Platform Configuration

Production-ready VAPI voice AI configuration for Qualia Solutions projects.

## Quick Start

### 1. Environment Variables

Add to your project's `.env.local`:

```env
# VAPI
VAPI_TOKEN=your_vapi_api_key
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_WEBHOOK_SECRET=your_webhook_secret

# Voice Providers
ELEVENLABS_API_KEY=your_elevenlabs_key
DEEPGRAM_API_KEY=your_deepgram_key

# Your API (for webhooks)
API_URL=https://your-api.com
API_KEY=your_api_key

# Optional: n8n for workflows
N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/xxx
```

### 2. Install Dependencies

```bash
npm install @vapi-ai/server-sdk @vapi-ai/web
```

### 3. Deploy Webhook

Copy `webhooks/vercel-edge.ts` to your project's `app/api/vapi/webhook/route.ts` (for Next.js App Router) and customize the function handlers.

### 4. Configure Assistant in VAPI Dashboard

1. Go to [dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Create new assistant
3. Import configuration from `assistants/` templates
4. Set Server URL to your webhook endpoint

## Directory Structure

```
platforms/vapi/
├── config/
│   └── qualia.config.ts      # Base configuration and profiles
├── assistants/
│   ├── customer-service.ts   # General customer service agent
│   ├── appointment-scheduler.ts  # Booking/scheduling agent
│   ├── lead-qualifier.ts     # Sales lead qualification
│   └── outbound-caller.ts    # Outbound calls (reminders, surveys)
├── webhooks/
│   ├── webhook-handler.ts    # Base webhook handler class
│   ├── vercel-edge.ts        # Vercel Edge Function template
│   └── supabase-integration.ts  # Full Supabase integration
├── prompts/                  # Custom prompt templates (add your own)
└── examples/                 # Example implementations (add your own)
```

## Assistant Templates

### Customer Service
General-purpose support agent for handling inquiries, complaints, and routing.

**Best for:** Support hotlines, general inquiries, complaint handling

**Functions:** lookupCustomer, createTicket, transferToAgent, scheduleCallback

### Appointment Scheduler
Efficient booking agent for scheduling, modifying, and canceling appointments.

**Best for:** Healthcare, salons, consultants, service businesses

**Functions:** checkAvailability, bookAppointment, lookupAppointment, rescheduleAppointment, cancelAppointment

### Lead Qualifier
Sales qualification agent using BANT framework.

**Best for:** Inbound sales, lead capture, demo scheduling

**Functions:** captureLeadInfo, updateQualification, transferToSales, scheduleDemo

### Outbound Caller
Agent for making outbound calls with preset configurations.

**Best for:** Appointment reminders, follow-ups, surveys, notifications

**Functions:** verifyIdentity, recordResponse, confirmAppointment, collectSurveyResponse

## Configuration Profiles

### Voice Profiles
```typescript
import { voiceProfiles } from './config/qualia.config';

// Available: professional, friendly, energetic, calm, authoritative
voiceProfiles.professional  // Adam - trustworthy male
voiceProfiles.friendly      // Rachel - warm female
voiceProfiles.energetic     // Josh - energetic male
voiceProfiles.calm          // Elli - soothing female
voiceProfiles.authoritative // Arnold - deep male
```

### Model Profiles
```typescript
import { modelProfiles } from './config/qualia.config';

// Available: quality, balanced, speed
modelProfiles.quality   // Claude Sonnet - best quality
modelProfiles.balanced  // Claude Haiku - good balance
modelProfiles.speed     // Groq Llama - fastest
```

## Integration Examples

### Next.js Web Client
```typescript
'use client';
import Vapi from '@vapi-ai/web';
import { useState } from 'react';

export function VoiceAssistant() {
  const [isActive, setIsActive] = useState(false);
  const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!);

  const startCall = async () => {
    setIsActive(true);
    await vapi.start({
      assistantId: 'your-assistant-id',
    });
  };

  const endCall = () => {
    vapi.stop();
    setIsActive(false);
  };

  return (
    <button onClick={isActive ? endCall : startCall}>
      {isActive ? 'End Call' : 'Start Call'}
    </button>
  );
}
```

### Outbound Call API
```typescript
import Vapi from '@vapi-ai/server-sdk';

const vapi = new Vapi({ token: process.env.VAPI_TOKEN });

// Make an outbound call
const call = await vapi.calls.create({
  phoneNumber: {
    twilioPhoneNumber: '+1234567890',
  },
  customer: {
    number: '+1987654321',
    name: 'John Doe',
  },
  assistantId: 'your-assistant-id',
  // Or use assistant overrides
  assistantOverrides: {
    firstMessage: 'Hi John! This is a reminder about your appointment tomorrow.',
  },
});
```

## Supabase Schema

Run the migration in `webhooks/supabase-integration.ts` to create:
- `vapi_calls` - Call records
- `vapi_transcripts` - Real-time transcripts
- `vapi_function_calls` - Function call logs

## Best Practices

### Latency Optimization
- Keep responses under 700ms total
- Use `modelProfiles.speed` for time-sensitive applications
- Reduce system prompt length
- Enable streaming between all layers

### Prompt Engineering
- Keep instructions concise and clear
- Use bullet points over paragraphs
- Include example responses
- Add personality sparingly

### Error Handling
- Always return structured responses from functions
- Log all errors for debugging
- Implement fallback behaviors
- Test edge cases thoroughly

### Security
- Validate webhook signatures
- Use environment variables for all secrets
- Implement rate limiting
- Don't expose sensitive data in voice responses

## MCP Server Access

The VAPI MCP server is configured in `~/.claude/settings.json`. Use it to:
- Create and manage assistants
- Start and monitor calls
- Access call recordings and transcripts
- Configure phone numbers

## Resources

- [VAPI Documentation](https://docs.vapi.ai)
- [VAPI Dashboard](https://dashboard.vapi.ai)
- [ElevenLabs Voices](https://elevenlabs.io/voice-library)
- [Deepgram Models](https://developers.deepgram.com/docs/models)
