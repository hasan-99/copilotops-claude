---
name: subscription-payments
description: "Subscription billing and payment gateway integration — Stripe/HyperPay adapter pattern, checkout sessions, webhook ingestion with signature validation, promo codes, subscription lifecycle management, and provider abstraction. Use whenever implementing payment processing, subscription management, checkout flows, webhook handlers, promo/discount systems, or payment provider integrations. Triggers on: subscription, payment, Stripe, HyperPay, checkout, webhook, billing, promo code, discount, payment gateway, recurring payment."
tags: [payments, subscription, stripe, billing]
---

## Provider Adapter Pattern

Abstract payment providers behind a common interface:

```typescript
interface PaymentProvider {
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  getSubscriptionStatus(providerSubscriptionId: string): Promise<SubscriptionStatus>;
}

class StripeProvider implements PaymentProvider {
  // Stripe-specific implementation
}

class HyperPayProvider implements PaymentProvider {
  // HyperPay-specific implementation
}

class PaymentProviderFactory {
  static create(provider: 'stripe' | 'hyperpay'): PaymentProvider {
    switch (provider) {
      case 'stripe':
        return new StripeProvider();
      case 'hyperpay':
        return new HyperPayProvider();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

- StripeProvider implements PaymentProvider
- HyperPayProvider implements PaymentProvider
- Factory pattern selects provider based on config
- Provider-specific logic NEVER leaks outside adapter

## Checkout Flow

1. Client requests price quote (snapshot pricing inputs + expiry)
2. Client applies promo code (optional — RESERVED state)
3. Client creates checkout session (validates quote not expired/consumed)
4. Redirect to provider-hosted checkout page
5. Provider webhook confirms payment
6. System activates subscription + consumes promo

## Webhook Ingestion

Critical security component:

```typescript
@Post('webhooks/:provider')
async handleWebhook(@Req() req, @Param('provider') provider: string) {
  // 1. Verify signature (BEFORE parsing body)
  const isValid = this.paymentService.verifySignature(
    provider,
    req.rawBody,
    req.headers
  );
  if (!isValid) throw new UnauthorizedException('WEBHOOK_SIGNATURE_INVALID');

  // 2. Parse to canonical event (provider-agnostic)
  const event = this.paymentService.normalizeEvent(provider, req.body);

  // 3. Idempotency check (provider_event_id is unique)
  const existing = await this.findEvent(event.providerEventId);
  if (existing) return { received: true }; // Already processed

  // 4. Store raw event for audit
  await this.storeEvent(event);

  // 5. Handle canonical event
  await this.processEvent(event);

  return { received: true };
}
```

- Always verify signature FIRST
- Always check idempotency (webhooks can be retried)
- Store raw payload for debugging
- Normalize to canonical events before processing

## Canonical Event Types

Map provider-specific events to canonical types:

```typescript
type CanonicalEventType =
  | 'checkout.completed'
  | 'subscription.activated'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'subscription.payment_failed'
  | 'refund.completed';

interface CanonicalEvent {
  id: string;
  providerEventId: string;
  type: CanonicalEventType;
  provider: 'stripe' | 'hyperpay';
  timestamp: Date;
  data: Record<string, any>;
}
```

## Subscription Lifecycle

TRIAL (30 days) → ACTIVE (payment confirmed) → INACTIVE (cancelled/expired/failed)

- Trial starts on building creation
- Trial expiry: background job checks daily
- Activation: webhook confirms first payment
- Renewal: webhook confirms recurring payment
- Cancellation: webhook or manual admin action
- Failed payment: grace period → INACTIVE

```typescript
enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
}

interface Subscription {
  id: string;
  buildingId: string;
  status: SubscriptionStatus;
  providerSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelledAt: Date | null;
}
```

## Promo Code System

- Codes have: discount_type (PERCENTAGE|FIXED), discount_value, max_redemptions, valid_from/until
- Redemption lifecycle: RESERVED (on checkout start) → CONSUMED (on payment success)
- Reservation is atomic (check-and-reserve in single query)
- If checkout abandoned, RESERVED codes expire after timeout
- If payment fails, RESERVED reverts to available

```typescript
enum PromoCodeStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  CONSUMED = 'consumed',
  EXPIRED = 'expired',
}

interface PromoCode {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxRedemptions: number;
  currentRedemptions: number;
  validFrom: Date;
  validUntil: Date;
  reservationExpiry: number; // minutes
}

interface PromoReservation {
  promoCodeId: string;
  checkoutSessionId: string;
  reservedAt: Date;
  expiresAt: Date;
}
```

## Price Quotes

- Quote snapshots pricing inputs (building_type, unit_count, plan) at creation time
- Quotes have expiry (prevents stale pricing)
- Quote is consumed when checkout session is created
- One quote → one checkout session (no reuse)

```typescript
interface PriceQuote {
  id: string;
  buildingId: string;
  buildingType: string;
  unitCount: number;
  plan: string;
  basePrice: number;
  promoCodeId?: string;
  promoDiscount: number;
  finalPrice: number;
  currency: string;
  expiresAt: Date;
  consumed: boolean;
  consumedAt?: Date;
}
```

## Reimbursement

When BM pays subscription on behalf of building:
- Create reimbursement_obligation on payment success
- Settlement methods: DUES_OFFSET (automatic) or MANUAL (staff-only)
- Idempotent creation (same checkout → same reimbursement)

```typescript
enum SettlementMethod {
  DUES_OFFSET = 'dues_offset',
  MANUAL = 'manual',
}

interface ReimbursementObligation {
  id: string;
  checkoutSessionId: string;
  subscriptionId: string;
  buildingId: string;
  amount: number;
  currency: string;
  settlementMethod: SettlementMethod;
  settledAt?: Date;
  createdAt: Date;
}
```

## Security

- Never log full card numbers or payment tokens
- Webhook endpoints have no auth (signature validation instead)
- Use provider's hosted checkout (never handle card data directly — PCI compliance)
- Store provider customer/subscription IDs, not payment methods
- Webhook signature verification is mandatory before any processing
- All webhook events stored for audit trail
- Idempotency keys prevent duplicate charges from retried webhooks

## Testing

- Mock payment providers in tests (never hit real APIs)
- Test webhook signature validation with known test signatures
- Test idempotency (same webhook delivered twice)
- Test promo code edge cases (expired, exhausted, concurrent reservations)
- Test quote expiry and consumption
- Test subscription lifecycle state transitions
- Test reimbursement obligation creation idempotency
