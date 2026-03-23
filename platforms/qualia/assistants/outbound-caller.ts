/**
 * Outbound Caller Assistant Template
 *
 * Voice agent for making outbound calls - appointment reminders,
 * follow-ups, surveys, and notifications.
 */

import { VapiConfig, voiceProfiles, modelProfiles } from '../config/qualia.config';

export const outboundCallerAssistant: VapiConfig = {
  name: 'Outbound Caller',
  description: 'Makes outbound calls for reminders, follow-ups, and surveys',

  model: {
    ...modelProfiles.balanced,
    systemPrompt: `You are making an outbound call on behalf of {{company_name}}.

CALL TYPE: {{call_type}}
RECIPIENT: {{recipient_name}}
PURPOSE: {{call_purpose}}
KEY INFO: {{call_details}}

IMPORTANT GUIDELINES:

1. INTRODUCE YOURSELF CLEARLY
   - State company name immediately
   - Explain why you're calling in one sentence
   - Ask if it's a good time to talk

2. IF THEY'RE BUSY
   - Offer to call back at a better time
   - Ask for their preferred callback time
   - Thank them and end gracefully

3. IF THEY ANSWER
   - Stay focused on the call purpose
   - Be concise and respectful of their time
   - Get confirmation of any actions needed
   - Summarize next steps before ending

4. IF VOICEMAIL
   - Leave a brief, clear message (under 30 seconds)
   - State company name, reason for call, callback number
   - Mention you'll try again or they can call back

5. COMPLIANCE
   - Never be pushy or aggressive
   - Respect "do not call" requests immediately
   - Don't disclose sensitive info to wrong person
   - Verify identity before discussing personal details

TONE: Professional but warm. You're here to help, not to sell.`,
  },

  voice: voiceProfiles.friendly,

  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
    smartFormat: true,
  },

  settings: {
    firstMessage: "Hi, this is {{agent_name}} calling from {{company_name}}. Am I speaking with {{recipient_name}}?",
    silenceTimeoutSeconds: 15,
    responseDelaySeconds: 0.3,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 2,
    endCallMessage: "Thank you for your time today. Have a great {{time_of_day}}!",
    voicemailMessage: "Hi {{recipient_name}}, this is {{agent_name}} from {{company_name}} calling about {{call_purpose}}. Please call us back at {{callback_number}} or we'll try you again soon. Thank you!",
    maxDurationSeconds: 600, // 10 minutes max for outbound
  },

  functions: [
    {
      name: 'verifyIdentity',
      description: 'Verify the person on the phone is the intended recipient',
      parameters: {
        type: 'object',
        properties: {
          verified: {
            type: 'string',
            description: 'Whether identity was verified',
            enum: ['yes', 'no', 'wrong_person', 'refused'],
          },
          actualPerson: {
            type: 'string',
            description: 'Name of actual person if different',
          },
        },
        required: ['verified'],
      },
    },
    {
      name: 'scheduleCallback',
      description: 'Schedule a callback at a better time',
      parameters: {
        type: 'object',
        properties: {
          callbackDate: {
            type: 'string',
            description: 'Preferred callback date',
          },
          callbackTime: {
            type: 'string',
            description: 'Preferred callback time',
          },
          phoneNumber: {
            type: 'string',
            description: 'Phone number to call (if different)',
          },
          notes: {
            type: 'string',
            description: 'Notes for callback',
          },
        },
        required: ['callbackDate', 'callbackTime'],
      },
    },
    {
      name: 'recordResponse',
      description: 'Record the recipients response or feedback',
      parameters: {
        type: 'object',
        properties: {
          responseType: {
            type: 'string',
            description: 'Type of response',
            enum: ['confirmed', 'declined', 'rescheduled', 'needs_info', 'callback', 'do_not_call'],
          },
          details: {
            type: 'string',
            description: 'Details of their response',
          },
          followUpNeeded: {
            type: 'string',
            description: 'Is follow-up needed',
            enum: ['yes', 'no'],
          },
        },
        required: ['responseType'],
      },
    },
    {
      name: 'leaveVoicemail',
      description: 'Indicate call went to voicemail',
      parameters: {
        type: 'object',
        properties: {
          messageLeft: {
            type: 'string',
            description: 'Was a message left',
            enum: ['yes', 'no', 'voicemail_full'],
          },
          retryScheduled: {
            type: 'string',
            description: 'When to retry the call',
          },
        },
        required: ['messageLeft'],
      },
    },
    {
      name: 'confirmAppointment',
      description: 'Confirm or modify an appointment (for reminder calls)',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Appointment status',
            enum: ['confirmed', 'cancelled', 'rescheduled', 'no_response'],
          },
          newDateTime: {
            type: 'string',
            description: 'New date/time if rescheduled',
          },
          cancellationReason: {
            type: 'string',
            description: 'Reason if cancelled',
          },
        },
        required: ['status'],
      },
    },
    {
      name: 'collectSurveyResponse',
      description: 'Collect survey responses (for survey calls)',
      parameters: {
        type: 'object',
        properties: {
          questionId: {
            type: 'string',
            description: 'Survey question identifier',
          },
          response: {
            type: 'string',
            description: 'Their response',
          },
          rating: {
            type: 'string',
            description: 'Numeric rating if applicable (1-10)',
          },
          comments: {
            type: 'string',
            description: 'Additional comments',
          },
        },
        required: ['questionId', 'response'],
      },
    },
    {
      name: 'addToDoNotCall',
      description: 'Add number to do-not-call list',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for DNC request',
          },
          requestedBy: {
            type: 'string',
            description: 'Who requested (if not recipient)',
          },
        },
        required: ['reason'],
      },
    },
  ],
};

// Preset configurations for common outbound call types
export const outboundPresets = {
  appointmentReminder: {
    call_type: 'Appointment Reminder',
    call_purpose: 'remind you about your upcoming appointment',
    firstMessage: "Hi, this is {{agent_name}} calling from {{company_name}} with a friendly reminder about your appointment on {{appointment_date}} at {{appointment_time}}. Am I speaking with {{recipient_name}}?",
  },

  followUp: {
    call_type: 'Follow-Up',
    call_purpose: 'follow up on our recent conversation',
    firstMessage: "Hi {{recipient_name}}, this is {{agent_name}} from {{company_name}}. I'm following up on {{follow_up_reason}}. Do you have a moment to chat?",
  },

  survey: {
    call_type: 'Customer Survey',
    call_purpose: 'get your feedback on your recent experience',
    firstMessage: "Hi, this is {{agent_name}} from {{company_name}}. We'd love to hear about your recent experience with us. Do you have 2 minutes for a quick survey?",
  },

  notification: {
    call_type: 'Important Notification',
    call_purpose: 'share important information',
    firstMessage: "Hi, this is {{agent_name}} from {{company_name}} with an important update regarding {{notification_topic}}. Am I speaking with {{recipient_name}}?",
  },
};

export default outboundCallerAssistant;
