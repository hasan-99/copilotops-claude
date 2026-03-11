---
name: fcm-notifications
description: "Firebase Cloud Messaging (FCM) push notifications — device token management, topic subscriptions, notification payloads, background handlers, in-app notification system, and notification preferences. Use whenever implementing push notifications, device registration, notification sending from backend, in-app notification feeds, or notification preferences. Triggers on: push notification, FCM, Firebase Cloud Messaging, notification, device token, notification feed, alert, in-app notification, notification preferences."
tags: [notifications, fcm, firebase, push]
---

## Architecture

```
Mobile App                    Backend (NestJS)              Firebase
─────────                    ────────────────              ────────
1. Request permission
2. Get device token    ──→   3. Store token in DB
                             4. On event (dues, ticket)
                             5. Build notification     ──→  6. FCM sends push
7. Receive push
8. Show/handle
```

## Device Token Management (Backend)

- Store device tokens per user (user can have multiple devices)
- Table: `device_token` (user_id, token, platform, created_at, last_used_at)
- Update token on every app launch (tokens can change)
- Clean up stale tokens (FCM returns errors for invalid tokens)
- Delete tokens on logout

## Sending Notifications (Backend - NestJS)

```typescript
@Injectable()
export class NotificationService {
  async send(userId: string, notification: NotificationPayload) {
    const tokens = await this.getActiveTokens(userId);
    if (tokens.length === 0) return;

    // Store in-app notification regardless of push
    await this.createInAppNotification(userId, notification);

    // Send push via FCM
    const message = {
      tokens: tokens.map(t => t.token),
      notification: {
        title: this.i18n.resolve(notification.titleKey, userId),
        body: this.i18n.resolve(notification.bodyKey, userId),
      },
      data: notification.data, // Custom payload for app handling
    };

    const response = await this.fcm.sendEachForMulticast(message);
    await this.handleFailedTokens(response, tokens);
  }
}
```

## Notification Payload Structure

```typescript
interface NotificationPayload {
  titleKey: string;        // i18n message key
  bodyKey: string;         // i18n message key
  type: NotificationType;  // For routing in-app
  data: {
    entityType: string;    // 'ticket', 'dues', 'guard_task', etc.
    entityId: string;
    buildingId?: string;
    unitId?: string;
  };
}
```

- Use message_keys for title/body (resolved to user's locale before sending)
- Include routing data so app can navigate to relevant screen on tap

## Topic Subscriptions

- Subscribe users to building-level topics: `building_{buildingId}`
- Use for building-wide announcements
- Subscribe on building join, unsubscribe on leave
- Alternative to fetching all member tokens for broadcast

## In-App Notification System

- `notification` table: user_id, type, title_key, body_key, data, read_at, created_at
- Separate from push — push is delivery mechanism, in-app is persistence
- Unread count badge
- Mark as read (individual or bulk)
- Notification feed screen with infinite scroll

## Notification Types (by domain)

- DUES_GENERATED — new dues cycle obligation
- DUES_LATE — obligation transitioned to late
- CREDIT_TOPUP_APPROVED/REJECTED — BM reviewed top-up
- TICKET_CREATED/UPDATED/ASSIGNED — ticket state changes
- GUARD_TASK_REMINDER — T-15m before scheduled task
- GUARD_TASK_ASSIGNED — new task assigned
- GUARD_INVITE — invitation to be building guard
- SUBSCRIPTION_EXPIRING — trial/subscription about to expire
- DOCUMENT_APPROVED/REJECTED — document review outcome
- CLAIM_APPROVED/REJECTED — unit claim review outcome

## Mobile Integration (React Native Expo)

- `expo-notifications` for handling both push and local
- Request permission on first relevant action (not on app launch)
- Register device token with backend after permission granted
- Handle notification tap: navigate to relevant screen using data payload
- Background notification handler for silent updates
- Notification categories for actionable notifications (approve/reject)

## Preferences

- User can toggle notification types on/off
- Store in user_notification_preferences table
- Backend checks preferences before sending
- Some notifications are mandatory (security alerts, subscription changes)

## Testing

- Use FCM test mode for development
- Mock NotificationService in unit tests
- Test token cleanup on invalid responses
- Test preference filtering
- Test i18n resolution for different locales
