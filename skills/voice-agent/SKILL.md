---
name: voice-agent
description: Build complete voice AI agents - design conversational flow, create VAPI assistant, integrate Supabase, deploy. Full voice agent development.
tags: [voice, vapi, ai-agent, supabase, elevenlabs]
---

# Voice Agent Builder

Build complete voice AI agents from design to deployment.

## Pipeline

```
1. Design Conversation Flow
       ↓
2. Create VAPI Assistant
       ↓
3. Setup Supabase Backend
       ↓
4. Configure Webhooks
       ↓
5. Deploy & Test
```

## Quick Start

Say: "build voice agent for [use case]"

Example: "build voice agent for appointment scheduling"

I will:
1. Design the conversation flow
2. Create VAPI assistant configuration
3. Set up Supabase tables for state
4. Configure webhooks
5. Deploy and test

## Stage 1: Design Conversation Flow

### Flow Diagram
```
┌──────────────────┐
│   Call Starts    │
└────────┬─────────┘
         ↓
┌──────────────────┐
│    Greeting      │
│ "Hello, how can  │
│  I help you?"    │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Intent Detection │
│ - Book appointment│
│ - Check status    │
│ - Other inquiry   │
└────────┬─────────┘
         ↓
   ┌─────┴─────┐
   ↓           ↓
┌──────┐   ┌──────┐
│ Book │   │ Help │
└──────┘   └──────┘
```

### State Machine
```typescript
const conversationStates = {
  GREETING: {
    next: ['INTENT_DETECTION'],
    actions: ['playGreeting']
  },
  INTENT_DETECTION: {
    next: ['BOOKING', 'STATUS_CHECK', 'TRANSFER'],
    actions: ['detectIntent']
  },
  BOOKING: {
    next: ['COLLECT_DATE', 'COLLECT_TIME', 'CONFIRM'],
    actions: ['startBooking']
  },
  // ...
};
```

## Stage 2: Create VAPI Assistant

### Assistant Configuration
```typescript
const assistant = {
  name: "Appointment Scheduler",
  model: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
    systemPrompt: `You are a friendly appointment scheduling assistant.
Your job is to help callers book appointments.

## Capabilities
- Book new appointments
- Check existing appointments
- Reschedule appointments
- Answer questions about services

## Conversation Flow
1. Greet the caller warmly
2. Ask how you can help
3. Collect necessary information
4. Confirm the action
5. End the call politely

## Important Rules
- Always confirm before booking
- Validate dates and times
- Collect caller's phone for confirmation
- Be concise but friendly`
  },
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
    stability: 0.5,
    similarityBoost: 0.75
  },
  firstMessage: "Hello! Thanks for calling. How can I help you today?",
  endCallMessage: "Thank you for calling. Have a great day!",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en"
  },
  serverUrl: "https://your-app.com/api/vapi-webhook"
};
```

### Create via VAPI MCP
```typescript
await mcp__vapi__create_assistant(assistant);
```

## Stage 3: Setup Supabase Backend

### Database Schema
```sql
-- Appointments table
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  service_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call logs
CREATE TABLE call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent state (for context between calls)
CREATE TABLE agent_state (
  phone_number TEXT PRIMARY KEY,
  last_call_id TEXT,
  context JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: service role only (called from edge functions)
CREATE POLICY "Service role full access" ON appointments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON call_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON agent_state
  FOR ALL USING (auth.role() = 'service_role');
```

### API Functions
```typescript
// supabase/functions/book-appointment/index.ts
import { z } from "https://deno.land/x/zod/mod.ts"

const BookingSchema = z.object({
  phone: z.string().min(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  service: z.string().min(1),
})

serve(async (req) => {
  try {
  const raw = await req.json();
  const { phone, date, time, service } = BookingSchema.parse(raw);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Check availability
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('appointment_date', date)
    .eq('appointment_time', time)
    .single();

  if (existing) {
    return new Response(JSON.stringify({
      success: false,
      message: "That time slot is already booked."
    }));
  }

  // Book appointment
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_phone: phone,
      appointment_date: date,
      appointment_time: time,
      service_type: service
    })
    .select()
    .single();

  return new Response(JSON.stringify({
    success: true,
    appointment: data,
    message: `Appointment booked for ${date} at ${time}`
  }));
  } catch (error) {
    console.error("Booking error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Failed to process booking request"
    }), { status: 500 });
  }
});
```

## Stage 4: Configure Webhooks

### VAPI Webhook Handler
```typescript
// supabase/functions/vapi-webhook/index.ts
serve(async (req) => {
  try {
  // Verify VAPI webhook signature
  const signature = req.headers.get('x-vapi-signature');
  const body = await req.text();

  if (!verifyVapiSignature(body, signature, Deno.env.get('VAPI_WEBHOOK_SECRET')!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(/* ... */);

  switch (event.message.type) {
    case 'function-call':
      // Handle tool calls
      const { name, parameters } = event.message.functionCall;

      switch (name) {
        case 'book_appointment':
          const result = await bookAppointment(parameters);
          return new Response(JSON.stringify({ result }));

        case 'check_availability':
          const slots = await checkAvailability(parameters);
          return new Response(JSON.stringify({ result: slots }));

        case 'get_customer_appointments':
          const appointments = await getAppointments(parameters.phone);
          return new Response(JSON.stringify({ result: appointments }));
      }
      break;

    case 'end-of-call-report':
      // Log call
      await supabase.from('call_logs').insert({
        call_id: event.call.id,
        phone_number: event.call.customer.number,
        duration_seconds: event.call.duration,
        transcript: event.transcript,
        outcome: event.call.endedReason
      });
      break;

    case 'status-update':
      console.log('Call status:', event.status);
      break;
  }

  return new Response('OK');
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### Tool Definitions
```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book a new appointment for the caller",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Time in HH:MM format" },
          service: { type: "string", description: "Type of service" }
        },
        required: ["date", "time", "service"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available appointment slots",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date to check" }
        },
        required: ["date"]
      }
    }
  }
];
```

## Stage 5: Deploy & Test

### Deploy Steps
```bash
# Deploy Supabase functions
supabase functions deploy book-appointment
supabase functions deploy vapi-webhook

# Update VAPI assistant with webhook URL
# Use VAPI dashboard or API

# Test with a call
vapi call --assistant-id your-assistant-id --to +1234567890
```

### Test Scenarios
1. **Happy path**: Book appointment successfully
2. **Conflict**: Time slot unavailable
3. **Edge case**: Invalid date format
4. **Error handling**: Database connection fails
5. **Context persistence**: Caller calls back

## Voice Selection (ElevenLabs)

| Use Case | Voice | Why |
|----------|-------|-----|
| Professional | Rachel | Calm, clear, authoritative |
| Friendly | Bella | Warm, approachable |
| Energetic | Elli | Upbeat, engaging |
| Corporate | Adam | Professional male |

## Best Practices

1. **Keep responses short** - 1-2 sentences max
2. **Confirm important info** - Repeat back dates/times
3. **Handle interruptions** - Allow user to interrupt
4. **Provide escape routes** - "Say 'operator' for help"
5. **Log everything** - For debugging and improvement
6. **Test extensively** - Real phone calls, various accents

## Integration with Other Skills

- **vapi-voice-agent** - For VAPI-specific patterns
- **supabase** - For database operations
- **elevenlabs-voice** - For voice generation
- **n8n-workflow** - For post-call automations

## Trigger Phrases

- "build voice agent"
- "create voice assistant"
- "voice AI for"
- "phone bot for"
