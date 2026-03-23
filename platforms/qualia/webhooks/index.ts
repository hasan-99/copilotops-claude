/**
 * VAPI Webhook Handlers Index
 */

export {
  VapiWebhookHandler,
  createWebhookHandler,
  type VapiWebhookEvent,
  type VapiEventType,
  type VapiCall,
  type VapiFunctionCall,
  type VapiTranscript,
  type VapiMessage,
  type FunctionCallResponse,
} from './webhook-handler';

export {
  VapiSupabaseHandler,
  createSupabaseHandler,
  migrationSQL,
} from './supabase-integration';
