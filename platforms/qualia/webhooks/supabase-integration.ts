/**
 * VAPI Webhook with Supabase Integration
 *
 * Complete webhook handler that stores call data in Supabase.
 * Includes call logs, transcripts, and analytics.
 */

import { createClient } from '@supabase/supabase-js';
import { VapiWebhookHandler, VapiWebhookEvent, VapiCall } from './webhook-handler';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side operations
);

// Database types (generate with: npx supabase gen types typescript)
interface Database {
  public: {
    Tables: {
      vapi_calls: {
        Row: {
          id: string;
          call_id: string;
          org_id: string;
          type: string;
          status: string;
          customer_phone: string | null;
          customer_name: string | null;
          assistant_id: string | null;
          started_at: string | null;
          ended_at: string | null;
          ended_reason: string | null;
          duration_seconds: number | null;
          cost: number | null;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vapi_calls']['Row'], 'id' | 'created_at'>;
      };
      vapi_transcripts: {
        Row: {
          id: string;
          call_id: string;
          role: string;
          content: string;
          timestamp: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vapi_transcripts']['Row'], 'id' | 'created_at'>;
      };
      vapi_function_calls: {
        Row: {
          id: string;
          call_id: string;
          function_name: string;
          parameters: Record<string, any>;
          result: Record<string, any> | null;
          error: string | null;
          executed_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vapi_function_calls']['Row'], 'id' | 'created_at'>;
      };
    };
  };
}

/**
 * Supabase-integrated VAPI webhook handler
 */
export class VapiSupabaseHandler extends VapiWebhookHandler {
  /**
   * Override to save call status to Supabase
   */
  async handleStatusUpdate(event: VapiWebhookEvent): Promise<void> {
    const call = event.call;
    if (!call) return;

    // Upsert call record
    const { error } = await supabase
      .from('vapi_calls')
      .upsert({
        call_id: call.id,
        org_id: call.orgId,
        type: call.type,
        status: call.status,
        customer_phone: call.customer?.number || null,
        customer_name: call.customer?.name || null,
        started_at: call.startedAt || null,
        metadata: {},
      }, {
        onConflict: 'call_id',
      });

    if (error) {
      console.error('[VAPI Supabase] Error saving call status:', error);
    }
  }

  /**
   * Override to save end-of-call report
   */
  async handleEndOfCall(event: VapiWebhookEvent): Promise<void> {
    const call = event.call;
    if (!call) return;

    // Calculate duration
    let durationSeconds = null;
    if (call.startedAt && call.endedAt) {
      durationSeconds = Math.round(
        (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
      );
    }

    // Update call record with final data
    const { error } = await supabase
      .from('vapi_calls')
      .update({
        status: 'ended',
        ended_at: call.endedAt || new Date().toISOString(),
        ended_reason: call.endedReason || null,
        duration_seconds: durationSeconds,
        cost: call.cost || null,
      })
      .eq('call_id', call.id);

    if (error) {
      console.error('[VAPI Supabase] Error updating end-of-call:', error);
    }

    // Trigger any post-call workflows
    await this.triggerPostCallWorkflows(call, durationSeconds);
  }

  /**
   * Override to save transcripts
   */
  async handleTranscript(event: VapiWebhookEvent): Promise<void> {
    const { transcript, call } = event;
    if (!transcript || !call) return;

    const { error } = await supabase
      .from('vapi_transcripts')
      .insert({
        call_id: call.id,
        role: transcript.role,
        content: transcript.text,
        timestamp: transcript.timestamp,
      });

    if (error) {
      console.error('[VAPI Supabase] Error saving transcript:', error);
    }
  }

  /**
   * Log function calls to database
   */
  async logFunctionCall(
    callId: string,
    functionName: string,
    parameters: Record<string, any>,
    result?: any,
    error?: string
  ): Promise<void> {
    const { error: dbError } = await supabase
      .from('vapi_function_calls')
      .insert({
        call_id: callId,
        function_name: functionName,
        parameters,
        result: result || null,
        error: error || null,
        executed_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('[VAPI Supabase] Error logging function call:', dbError);
    }
  }

  /**
   * Trigger post-call workflows (n8n, email notifications, etc.)
   */
  private async triggerPostCallWorkflows(call: VapiCall, duration: number | null): Promise<void> {
    // Example: Notify via n8n webhook for long calls or specific outcomes
    if (duration && duration > 300) { // 5+ minute calls
      try {
        await fetch(process.env.N8N_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'long_call',
            callId: call.id,
            duration,
            customerPhone: call.customer?.number,
            endedReason: call.endedReason,
          }),
        });
      } catch (error) {
        console.error('[VAPI Supabase] Error triggering workflow:', error);
      }
    }
  }
}

/**
 * Create handler with Supabase integration and register functions
 */
export function createSupabaseHandler(): VapiSupabaseHandler {
  const handler = new VapiSupabaseHandler(process.env.VAPI_WEBHOOK_SECRET);

  // Register functions with database logging
  handler.registerFunction('scheduleAppointment', async (params, call) => {
    try {
      // Create appointment in Supabase
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          customer_phone: call.customer?.number,
          customer_name: params.name,
          date: params.date,
          time: params.time,
          reason: params.reason,
          status: 'scheduled',
          source: 'vapi_call',
          call_id: call.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the function call
      await handler.logFunctionCall(call.id, 'scheduleAppointment', params, data);

      return {
        success: true,
        confirmationNumber: data.id,
        message: `Appointment scheduled for ${params.date} at ${params.time}`,
      };
    } catch (error) {
      await handler.logFunctionCall(call.id, 'scheduleAppointment', params, null, String(error));
      throw error;
    }
  });

  handler.registerFunction('lookupCustomer', async (params, call) => {
    try {
      // Look up customer in Supabase
      let query = supabase.from('customers').select('id, name, email, phone, status, account_number');

      if (params.identifierType === 'phone') {
        query = query.eq('phone', params.identifier);
      } else if (params.identifierType === 'email') {
        query = query.eq('email', params.identifier);
      } else if (params.identifierType === 'account') {
        query = query.eq('account_number', params.identifier);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        await handler.logFunctionCall(call.id, 'lookupCustomer', params, { found: false });
        return { found: false, message: 'Customer not found' };
      }

      const result = {
        found: true,
        name: data.name,
        accountNumber: data.account_number,
        status: data.status,
      };

      await handler.logFunctionCall(call.id, 'lookupCustomer', params, result);
      return result;
    } catch (error) {
      await handler.logFunctionCall(call.id, 'lookupCustomer', params, null, String(error));
      throw error;
    }
  });

  handler.registerFunction('createTicket', async (params, call) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          call_id: call.id,
          customer_phone: call.customer?.number,
          category: params.category,
          priority: params.priority || 'medium',
          summary: params.summary,
          details: params.details,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      const result = {
        success: true,
        ticketNumber: data.ticket_number,
        message: `Support ticket created: ${data.ticket_number}`,
      };

      await handler.logFunctionCall(call.id, 'createTicket', params, result);
      return result;
    } catch (error) {
      await handler.logFunctionCall(call.id, 'createTicket', params, null, String(error));
      throw error;
    }
  });

  return handler;
}

// SQL migration for the tables (run this in Supabase)
export const migrationSQL = `
-- VAPI Calls table
CREATE TABLE IF NOT EXISTS vapi_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT UNIQUE NOT NULL,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  assistant_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_reason TEXT,
  duration_seconds INTEGER,
  cost DECIMAL(10,4),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VAPI Transcripts table
CREATE TABLE IF NOT EXISTS vapi_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES vapi_calls(call_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VAPI Function Calls table
CREATE TABLE IF NOT EXISTS vapi_function_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES vapi_calls(call_id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  error TEXT,
  executed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vapi_calls_status ON vapi_calls(status);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_customer_phone ON vapi_calls(customer_phone);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_created_at ON vapi_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_vapi_transcripts_call_id ON vapi_transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_vapi_function_calls_call_id ON vapi_function_calls(call_id);

-- Enable RLS
ALTER TABLE vapi_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapi_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapi_function_calls ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth model)
-- Service role can do everything
CREATE POLICY "Service role full access" ON vapi_calls
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON vapi_transcripts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON vapi_function_calls
  FOR ALL USING (auth.role() = 'service_role');
`;

export default createSupabaseHandler;
