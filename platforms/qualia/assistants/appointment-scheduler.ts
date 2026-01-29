/**
 * Appointment Scheduler Assistant Template
 *
 * Voice agent specialized in booking, modifying, and canceling appointments.
 * Perfect for healthcare, salons, consultants, and service businesses.
 */

import { VapiConfig, voiceProfiles, modelProfiles } from '../config/qualia.config';

export const appointmentSchedulerAssistant: VapiConfig = {
  name: 'Appointment Scheduler',
  description: 'Books, modifies, and cancels appointments efficiently',

  model: {
    ...modelProfiles.quality,
    systemPrompt: `You are an efficient appointment scheduling assistant for {{company_name}}.

Your role:
- Help callers book new appointments
- Modify or cancel existing appointments
- Answer questions about availability and services
- Collect necessary information for bookings

Workflow for NEW appointments:
1. Greet and ask what service they need
2. Ask for their preferred date/time
3. Check availability and offer options
4. Collect their name and contact information
5. Confirm all details before booking
6. Provide confirmation number and any prep instructions

Workflow for EXISTING appointments:
1. Ask for name or confirmation number
2. Look up their appointment
3. Confirm the appointment details
4. Ask what change they need (reschedule or cancel)
5. Process the change and confirm

Key behaviors:
- Always repeat back dates and times to confirm
- Mention any cancellation policies when relevant
- Offer alternative times if first choice is unavailable
- Send confirmation details via SMS if they agree
- Be efficient but not rushed

Information needed for booking:
- Service type
- Preferred date and time (with backup options)
- Full name
- Phone number
- Email (optional but recommended)
- Any special requirements or notes`,
  },

  voice: voiceProfiles.professional,

  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
    smartFormat: true,
  },

  settings: {
    firstMessage: "Hello! Thank you for calling {{company_name}}. I can help you schedule, change, or cancel an appointment. Are you calling about a new appointment or an existing one?",
    silenceTimeoutSeconds: 20,
    responseDelaySeconds: 0.3,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 2,
    endCallMessage: "Your appointment is all set! You'll receive a confirmation text shortly. Is there anything else I can help you with?",
    maxDurationSeconds: 900, // 15 minutes should be plenty for scheduling
  },

  functions: [
    {
      name: 'checkAvailability',
      description: 'Check available appointment slots for a specific date and service',
      parameters: {
        type: 'object',
        properties: {
          serviceType: {
            type: 'string',
            description: 'Type of service or appointment',
          },
          date: {
            type: 'string',
            description: 'Date to check (YYYY-MM-DD format)',
          },
          preferredTime: {
            type: 'string',
            description: 'Preferred time of day',
            enum: ['morning', 'afternoon', 'evening', 'any'],
          },
          provider: {
            type: 'string',
            description: 'Specific provider/staff member if requested',
          },
        },
        required: ['serviceType', 'date'],
      },
    },
    {
      name: 'bookAppointment',
      description: 'Book a new appointment',
      parameters: {
        type: 'object',
        properties: {
          serviceType: {
            type: 'string',
            description: 'Type of service',
          },
          dateTime: {
            type: 'string',
            description: 'Appointment date and time (ISO 8601)',
          },
          customerName: {
            type: 'string',
            description: 'Customer full name',
          },
          phoneNumber: {
            type: 'string',
            description: 'Customer phone number',
          },
          email: {
            type: 'string',
            description: 'Customer email',
          },
          notes: {
            type: 'string',
            description: 'Special requests or notes',
          },
          provider: {
            type: 'string',
            description: 'Requested provider/staff',
          },
        },
        required: ['serviceType', 'dateTime', 'customerName', 'phoneNumber'],
      },
    },
    {
      name: 'lookupAppointment',
      description: 'Look up an existing appointment',
      parameters: {
        type: 'object',
        properties: {
          confirmationNumber: {
            type: 'string',
            description: 'Appointment confirmation number',
          },
          customerName: {
            type: 'string',
            description: 'Customer name to search',
          },
          phoneNumber: {
            type: 'string',
            description: 'Phone number to search',
          },
        },
      },
    },
    {
      name: 'rescheduleAppointment',
      description: 'Reschedule an existing appointment',
      parameters: {
        type: 'object',
        properties: {
          confirmationNumber: {
            type: 'string',
            description: 'Current appointment confirmation number',
          },
          newDateTime: {
            type: 'string',
            description: 'New date and time (ISO 8601)',
          },
          reason: {
            type: 'string',
            description: 'Reason for rescheduling',
          },
        },
        required: ['confirmationNumber', 'newDateTime'],
      },
    },
    {
      name: 'cancelAppointment',
      description: 'Cancel an existing appointment',
      parameters: {
        type: 'object',
        properties: {
          confirmationNumber: {
            type: 'string',
            description: 'Appointment confirmation number',
          },
          reason: {
            type: 'string',
            description: 'Reason for cancellation',
          },
        },
        required: ['confirmationNumber'],
      },
    },
    {
      name: 'sendConfirmation',
      description: 'Send appointment confirmation via SMS or email',
      parameters: {
        type: 'object',
        properties: {
          confirmationNumber: {
            type: 'string',
            description: 'Appointment confirmation number',
          },
          method: {
            type: 'string',
            description: 'How to send confirmation',
            enum: ['sms', 'email', 'both'],
          },
        },
        required: ['confirmationNumber', 'method'],
      },
    },
  ],
};

export default appointmentSchedulerAssistant;
