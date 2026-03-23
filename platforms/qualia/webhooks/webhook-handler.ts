/**
 * VAPI Webhook Handler for Qualia Solutions
 *
 * Standard webhook handler for processing VAPI events.
 * Deploy as Vercel Edge Function or Express server.
 */

import crypto from 'crypto';

// Types
export interface VapiWebhookEvent {
  type: VapiEventType;
  call?: VapiCall;
  functionCall?: VapiFunctionCall;
  transcript?: VapiTranscript;
  message?: VapiMessage;
  timestamp: string;
}

export type VapiEventType =
  | 'assistant-request'
  | 'function-call'
  | 'status-update'
  | 'end-of-call-report'
  | 'hang'
  | 'speech-update'
  | 'transcript'
  | 'tool-calls';

export interface VapiCall {
  id: string;
  orgId: string;
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'ended' | 'failed';
  phoneNumber?: {
    twilioPhoneNumber?: string;
    number: string;
  };
  customer?: {
    number: string;
    name?: string;
  };
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  cost?: number;
}

export interface VapiFunctionCall {
  name: string;
  parameters: Record<string, any>;
}

export interface VapiTranscript {
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

export interface VapiMessage {
  role: string;
  content: string;
}

// Response types for function calls
export interface FunctionCallResponse {
  result?: any;
  error?: string;
}

// Webhook handler class
export class VapiWebhookHandler {
  private secretKey?: string;
  private functionHandlers: Map<string, (params: any, call: VapiCall) => Promise<any>>;

  constructor(secretKey?: string) {
    this.secretKey = secretKey;
    this.functionHandlers = new Map();
  }

  /**
   * Register a function handler
   */
  registerFunction(name: string, handler: (params: any, call: VapiCall) => Promise<any>) {
    this.functionHandlers.set(name, handler);
  }

  /**
   * Verify webhook signature (if using VAPI's signature verification)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.secretKey) return true; // Skip if no secret configured

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Process incoming webhook event
   */
  async handleEvent(event: VapiWebhookEvent): Promise<FunctionCallResponse | void> {
    console.log(`[VAPI Webhook] Event received: ${event.type}`, {
      callId: event.call?.id,
      timestamp: event.timestamp,
    });

    switch (event.type) {
      case 'assistant-request':
        return this.handleAssistantRequest(event);

      case 'function-call':
        return this.handleFunctionCall(event);

      case 'status-update':
        await this.handleStatusUpdate(event);
        break;

      case 'end-of-call-report':
        await this.handleEndOfCall(event);
        break;

      case 'transcript':
        await this.handleTranscript(event);
        break;

      case 'hang':
        await this.handleHang(event);
        break;

      default:
        console.log(`[VAPI Webhook] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle assistant-request (dynamic assistant configuration)
   */
  private async handleAssistantRequest(event: VapiWebhookEvent): Promise<any> {
    // Return dynamic assistant configuration based on call context
    const call = event.call;

    // Example: Route to different assistants based on phone number
    // Override in your implementation
    return {
      assistant: {
        // Your assistant configuration
      },
    };
  }

  /**
   * Handle function calls from the assistant
   */
  private async handleFunctionCall(event: VapiWebhookEvent): Promise<FunctionCallResponse> {
    const { functionCall, call } = event;

    if (!functionCall || !call) {
      return { error: 'Missing function call data' };
    }

    const handler = this.functionHandlers.get(functionCall.name);

    if (!handler) {
      console.error(`[VAPI Webhook] No handler for function: ${functionCall.name}`);
      return { error: `Unknown function: ${functionCall.name}` };
    }

    try {
      const result = await handler(functionCall.parameters, call);
      return { result };
    } catch (error) {
      console.error(`[VAPI Webhook] Function error:`, error);
      return {
        error: error instanceof Error ? error.message : 'Function execution failed',
      };
    }
  }

  /**
   * Handle call status updates
   */
  private async handleStatusUpdate(event: VapiWebhookEvent): Promise<void> {
    const call = event.call;
    if (!call) return;

    console.log(`[VAPI Webhook] Call status update:`, {
      callId: call.id,
      status: call.status,
      customer: call.customer?.number,
    });

    // Override to add your status handling (e.g., update database)
  }

  /**
   * Handle end of call report
   */
  private async handleEndOfCall(event: VapiWebhookEvent): Promise<void> {
    const call = event.call;
    if (!call) return;

    console.log(`[VAPI Webhook] Call ended:`, {
      callId: call.id,
      endedReason: call.endedReason,
      duration: call.startedAt && call.endedAt
        ? (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
        : null,
      cost: call.cost,
    });

    // Override to add your end-of-call handling
    // - Save call recording
    // - Update CRM
    // - Trigger follow-up workflows
  }

  /**
   * Handle transcript updates
   */
  private async handleTranscript(event: VapiWebhookEvent): Promise<void> {
    const { transcript, call } = event;
    if (!transcript || !call) return;

    console.log(`[VAPI Webhook] Transcript:`, {
      callId: call.id,
      role: transcript.role,
      text: transcript.text,
    });

    // Override to save real-time transcript
  }

  /**
   * Handle hang event (call interrupted or issue)
   */
  private async handleHang(event: VapiWebhookEvent): Promise<void> {
    const call = event.call;
    if (!call) return;

    console.log(`[VAPI Webhook] Call hang detected:`, {
      callId: call.id,
      endedReason: call.endedReason,
    });

    // Override to handle call issues
  }
}

// Create and export default handler
export const createWebhookHandler = (secretKey?: string): VapiWebhookHandler => {
  const handler = new VapiWebhookHandler(secretKey);

  // Register default function handlers
  // These should be overridden with your actual implementations

  handler.registerFunction('transferCall', async (params, call) => {
    console.log('Transfer requested:', params);
    return {
      success: true,
      message: `Transferring to ${params.department}`,
      // Return the phone number to transfer to
      transferNumber: getTransferNumber(params.department),
    };
  });

  handler.registerFunction('scheduleCallback', async (params, call) => {
    console.log('Callback scheduled:', params);
    return {
      success: true,
      message: `Callback scheduled for ${params.preferredDate} at ${params.preferredTime}`,
      callbackId: generateCallbackId(),
    };
  });

  handler.registerFunction('collectInfo', async (params, call) => {
    console.log('Info collected:', params);
    return {
      success: true,
      message: 'Information saved successfully',
    };
  });

  return handler;
};

// Helper functions (implement your own logic)
function getTransferNumber(department: string): string {
  const numbers: Record<string, string> = {
    sales: '+1234567890',
    support: '+1234567891',
    billing: '+1234567892',
    general: '+1234567893',
  };
  return numbers[department] || numbers.general;
}

function generateCallbackId(): string {
  return `CB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default createWebhookHandler;
