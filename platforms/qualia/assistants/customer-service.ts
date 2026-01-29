/**
 * Customer Service Assistant Template
 *
 * General-purpose customer service voice agent for handling
 * inquiries, complaints, and routing calls.
 */

import { VapiConfig, voiceProfiles, modelProfiles } from '../config/qualia.config';

export const customerServiceAssistant: VapiConfig = {
  name: 'Customer Service Assistant',
  description: 'Handles customer inquiries, complaints, and routes to appropriate departments',

  model: {
    ...modelProfiles.balanced,
    systemPrompt: `You are a helpful customer service representative for {{company_name}}.

Your role:
- Answer customer questions about products and services
- Help resolve issues and complaints professionally
- Collect information to route to the right department if needed
- Stay calm and empathetic, even with frustrated callers

Guidelines:
- Always introduce yourself and the company
- Listen actively and acknowledge customer concerns
- Ask clarifying questions before making assumptions
- Offer solutions or next steps
- If you can't help, explain what will happen next
- Thank customers for their patience

Do NOT:
- Make promises you can't keep
- Share confidential information
- Argue with customers
- Guess at answers - say you'll find out

End every call with a summary and clear next steps.`,
  },

  voice: voiceProfiles.friendly,

  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
    smartFormat: true,
  },

  settings: {
    firstMessage: "Hi, thank you for calling {{company_name}}! My name is {{agent_name}} and I'm here to help. How can I assist you today?",
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 0.5,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 2,
    endCallMessage: "Thank you for contacting {{company_name}}. Is there anything else I can help you with before we end the call?",
    maxDurationSeconds: 1800,
  },

  functions: [
    {
      name: 'lookupCustomer',
      description: 'Look up customer information by phone, email, or account number',
      parameters: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Phone number, email, or account number',
          },
          identifierType: {
            type: 'string',
            description: 'Type of identifier',
            enum: ['phone', 'email', 'account'],
          },
        },
        required: ['identifier', 'identifierType'],
      },
    },
    {
      name: 'createTicket',
      description: 'Create a support ticket for the customer',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Ticket category',
            enum: ['technical', 'billing', 'product', 'complaint', 'general'],
          },
          priority: {
            type: 'string',
            description: 'Ticket priority',
            enum: ['low', 'medium', 'high', 'urgent'],
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the issue',
          },
          details: {
            type: 'string',
            description: 'Detailed description of the issue',
          },
        },
        required: ['category', 'summary'],
      },
    },
    {
      name: 'transferToAgent',
      description: 'Transfer the call to a human agent',
      parameters: {
        type: 'object',
        properties: {
          department: {
            type: 'string',
            description: 'Department to transfer to',
            enum: ['sales', 'support', 'billing', 'technical', 'manager'],
          },
          reason: {
            type: 'string',
            description: 'Reason for transfer',
          },
          urgency: {
            type: 'string',
            description: 'Urgency level',
            enum: ['normal', 'high'],
          },
        },
        required: ['department', 'reason'],
      },
    },
    {
      name: 'scheduleCallback',
      description: 'Schedule a callback from a specialist',
      parameters: {
        type: 'object',
        properties: {
          phoneNumber: {
            type: 'string',
            description: 'Phone number to call back',
          },
          preferredDate: {
            type: 'string',
            description: 'Preferred date for callback',
          },
          preferredTime: {
            type: 'string',
            description: 'Preferred time window',
            enum: ['morning', 'afternoon', 'evening'],
          },
          reason: {
            type: 'string',
            description: 'Reason for callback',
          },
        },
        required: ['phoneNumber', 'preferredDate', 'preferredTime'],
      },
    },
  ],
};

export default customerServiceAssistant;
