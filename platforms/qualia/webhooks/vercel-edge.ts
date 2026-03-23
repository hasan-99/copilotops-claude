/**
 * VAPI Webhook - Vercel Edge Function
 *
 * Deploy this to your Vercel project's api/ directory.
 * File: api/vapi/webhook.ts
 */

import { createWebhookHandler, VapiWebhookEvent } from './webhook-handler';

// Initialize handler with your secret
const handler = createWebhookHandler(process.env.VAPI_WEBHOOK_SECRET);

// Register your custom function handlers
handler.registerFunction('scheduleAppointment', async (params, call) => {
  // Example: Integrate with your scheduling system
  const response = await fetch(`${process.env.API_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
    body: JSON.stringify({
      customerPhone: call.customer?.number,
      date: params.date,
      time: params.time,
      name: params.name,
      reason: params.reason,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to schedule appointment');
  }

  const appointment = await response.json();

  return {
    success: true,
    confirmationNumber: appointment.id,
    message: `Appointment scheduled for ${params.date} at ${params.time}`,
  };
});

handler.registerFunction('lookupCustomer', async (params, call) => {
  // Example: Look up customer in your database
  const response = await fetch(
    `${process.env.API_URL}/customers?${params.identifierType}=${encodeURIComponent(params.identifier)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    return {
      found: false,
      message: 'Customer not found in our system',
    };
  }

  const customer = await response.json();

  return {
    found: true,
    name: customer.name,
    accountNumber: customer.accountNumber,
    status: customer.status,
    // Don't return sensitive info!
  };
});

handler.registerFunction('createTicket', async (params, call) => {
  // Example: Create support ticket
  const response = await fetch(`${process.env.API_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
    body: JSON.stringify({
      callId: call.id,
      customerPhone: call.customer?.number,
      category: params.category,
      priority: params.priority || 'medium',
      summary: params.summary,
      details: params.details,
    }),
  });

  const ticket = await response.json();

  return {
    success: true,
    ticketNumber: ticket.number,
    message: `Support ticket ${ticket.number} created successfully`,
  };
});

// Vercel Edge Function export
export const config = {
  runtime: 'edge',
};

export default async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify signature if configured
    const signature = request.headers.get('x-vapi-signature') || '';
    if (process.env.VAPI_WEBHOOK_SECRET && !handler.verifySignature(rawBody, signature)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the event
    const event: VapiWebhookEvent = JSON.parse(rawBody);

    // Handle the event
    const result = await handler.handleEvent(event);

    // Return result for function calls
    if (result) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return success for other events
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[VAPI Webhook] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
