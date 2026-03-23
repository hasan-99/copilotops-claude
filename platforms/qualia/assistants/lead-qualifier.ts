/**
 * Lead Qualifier Assistant Template
 *
 * Voice agent for qualifying sales leads, capturing prospect information,
 * and routing qualified leads to sales teams.
 */

import { VapiConfig, voiceProfiles, modelProfiles } from '../config/qualia.config';

export const leadQualifierAssistant: VapiConfig = {
  name: 'Lead Qualifier',
  description: 'Qualifies inbound leads and routes to sales team',

  model: {
    ...modelProfiles.quality,
    systemPrompt: `You are a friendly lead qualification specialist for {{company_name}}.

Your goal is to have a natural conversation while gathering key information about prospects.

QUALIFICATION CRITERIA (BANT framework):
- Budget: Can they afford our solution? What's their budget range?
- Authority: Are they the decision maker? Who else is involved?
- Need: What problem are they trying to solve? How urgent?
- Timeline: When are they looking to make a decision?

CONVERSATION FLOW:
1. Warm greeting and thank them for their interest
2. Ask what prompted them to reach out
3. Naturally weave in qualifying questions through conversation
4. Listen for buying signals and pain points
5. If qualified: offer to connect with sales or schedule demo
6. If not qualified: provide helpful resources and keep door open

QUALIFYING QUESTIONS (ask naturally, not as interrogation):
- "What challenges are you currently facing with [area]?"
- "How are you handling this today?"
- "What would an ideal solution look like for you?"
- "Who else would be involved in evaluating a solution?"
- "What's your timeline for making a decision?"
- "Do you have a budget in mind for this?"

LEAD SCORING:
- Hot (80-100): Clear need, budget, authority, short timeline
- Warm (50-79): Good fit but missing 1-2 BANT criteria
- Cold (0-49): Poor fit or not ready to buy

BEHAVIORS:
- Be conversational, not salesy
- Show genuine interest in their challenges
- Don't push too hard on budget early
- Take notes on everything they share
- If they're not ready, schedule a follow-up
- Always be helpful, even if they don't qualify`,
  },

  voice: voiceProfiles.professional,

  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
    smartFormat: true,
  },

  settings: {
    firstMessage: "Hi there! Thank you for reaching out to {{company_name}}. I'm here to learn a bit about your needs and make sure I connect you with the right person on our team. What prompted you to get in touch today?",
    silenceTimeoutSeconds: 25,
    responseDelaySeconds: 0.5,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 2,
    endCallMessage: "Thank you so much for taking the time to speak with me today. I'll make sure the right person follows up with you. Have a great day!",
    maxDurationSeconds: 1200, // 20 minutes max
  },

  functions: [
    {
      name: 'captureLeadInfo',
      description: 'Capture and save lead information',
      parameters: {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          company: { type: 'string', description: 'Company name' },
          title: { type: 'string', description: 'Job title' },
          companySize: {
            type: 'string',
            description: 'Company size',
            enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
          },
        },
        required: ['firstName', 'email'],
      },
    },
    {
      name: 'updateQualification',
      description: 'Update lead qualification data',
      parameters: {
        type: 'object',
        properties: {
          budget: {
            type: 'string',
            description: 'Budget range or status',
            enum: ['unknown', 'no_budget', 'under_10k', '10k_50k', '50k_100k', 'over_100k'],
          },
          authority: {
            type: 'string',
            description: 'Decision making authority',
            enum: ['decision_maker', 'influencer', 'researcher', 'unknown'],
          },
          need: {
            type: 'string',
            description: 'Level of need',
            enum: ['critical', 'important', 'nice_to_have', 'exploring', 'unknown'],
          },
          timeline: {
            type: 'string',
            description: 'Purchase timeline',
            enum: ['immediate', 'this_quarter', 'this_year', 'next_year', 'unknown'],
          },
          painPoints: {
            type: 'string',
            description: 'Main pain points identified',
          },
          currentSolution: {
            type: 'string',
            description: 'What they currently use',
          },
        },
      },
    },
    {
      name: 'calculateLeadScore',
      description: 'Calculate and return the lead score',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for scoring request',
          },
        },
      },
    },
    {
      name: 'transferToSales',
      description: 'Transfer qualified lead to sales representative',
      parameters: {
        type: 'object',
        properties: {
          salesRep: {
            type: 'string',
            description: 'Specific sales rep to transfer to',
          },
          priority: {
            type: 'string',
            description: 'Priority level',
            enum: ['normal', 'high', 'urgent'],
          },
          notes: {
            type: 'string',
            description: 'Summary notes for sales rep',
          },
        },
        required: ['notes'],
      },
    },
    {
      name: 'scheduleDemo',
      description: 'Schedule a product demo',
      parameters: {
        type: 'object',
        properties: {
          preferredDate: {
            type: 'string',
            description: 'Preferred demo date',
          },
          preferredTime: {
            type: 'string',
            description: 'Preferred time slot',
          },
          attendees: {
            type: 'string',
            description: 'Who will attend the demo',
          },
          focusAreas: {
            type: 'string',
            description: 'Specific areas to focus on in demo',
          },
        },
        required: ['preferredDate', 'preferredTime'],
      },
    },
    {
      name: 'scheduleFollowUp',
      description: 'Schedule a follow-up call for later',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Follow-up date',
          },
          reason: {
            type: 'string',
            description: 'Reason for follow-up',
          },
          notes: {
            type: 'string',
            description: 'Notes for the follow-up call',
          },
        },
        required: ['date', 'reason'],
      },
    },
    {
      name: 'sendResources',
      description: 'Send helpful resources to the prospect',
      parameters: {
        type: 'object',
        properties: {
          resourceType: {
            type: 'string',
            description: 'Type of resource to send',
            enum: ['brochure', 'case_study', 'pricing', 'demo_video', 'whitepaper'],
          },
          email: {
            type: 'string',
            description: 'Email to send resources to',
          },
        },
        required: ['resourceType', 'email'],
      },
    },
  ],
};

export default leadQualifierAssistant;
