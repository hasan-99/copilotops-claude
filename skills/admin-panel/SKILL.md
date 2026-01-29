---
name: admin-panel
description: Build admin dashboard for AI agent - users, conversations, channels, analytics. Quick setup with existing auth.
model: claude-opus-4-5-20251101
tags: [admin, dashboard, ui, management]
---

# Admin Panel

Build a functional admin dashboard quickly. Users, conversations, channel status, analytics.

## Features

- User management (list, view, disable)
- Conversation history (view, search, export)
- Channel status (health, message counts)
- Analytics (usage, trends)
- Configuration (settings, secrets)

## Pipeline

```
1. Analyze Existing Setup
       ↓
2. Create Admin Routes
       ↓
3. Build Dashboard Components
       ↓
4. Add Data Tables
       ↓
5. Protect with Auth
```

## Phase 1: Analyze Existing Setup

```bash
# Check for existing admin
ls -la app/admin/ app/(admin)/ pages/admin/ 2>/dev/null

# Check auth setup
cat lib/auth/ middleware.ts

# Check database schema
cat lib/db/schema.ts
```

## Phase 2: Create Admin Routes

### Next.js App Router Structure

```
app/(admin)/
├── admin/
│   ├── layout.tsx          # Admin layout with sidebar
│   ├── page.tsx            # Dashboard overview
│   ├── users/
│   │   └── page.tsx        # User management
│   ├── conversations/
│   │   ├── page.tsx        # Conversation list
│   │   └── [id]/page.tsx   # Single conversation
│   ├── channels/
│   │   └── page.tsx        # Channel status
│   └── settings/
│       └── page.tsx        # Configuration
```

### Admin Layout

```tsx
// app/(admin)/admin/layout.tsx
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/sidebar"

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Check admin role
  if (!session?.user?.isAdmin) {
    redirect("/")
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

## Phase 3: Dashboard Components

### Stats Cards

```tsx
// components/admin/stats-card.tsx
interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {change && (
        <p className="mt-1 text-sm text-green-600">{change}</p>
      )}
    </div>
  )
}
```

### Dashboard Page

```tsx
// app/(admin)/admin/page.tsx
import { StatsCard } from "@/components/admin/stats-card"
import { RecentConversations } from "@/components/admin/recent-conversations"
import { ChannelHealth } from "@/components/admin/channel-health"
import { getStats } from "@/lib/admin/stats"

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          change="+12% from last month"
          icon={<UsersIcon />}
        />
        <StatsCard
          title="Conversations"
          value={stats.totalConversations}
          icon={<MessageIcon />}
        />
        <StatsCard
          title="Messages Today"
          value={stats.messagesToday}
          icon={<ChatIcon />}
        />
        <StatsCard
          title="Active Channels"
          value={stats.activeChannels}
          icon={<RadioIcon />}
        />
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentConversations />
        <ChannelHealth />
      </div>
    </div>
  )
}
```

## Phase 4: Data Tables

### User Management Table

```tsx
// app/(admin)/admin/users/page.tsx
import { DataTable } from "@/components/ui/data-table"
import { getUsers } from "@/lib/admin/users"

const columns = [
  { accessorKey: "email", header: "Email" },
  { accessorKey: "createdAt", header: "Joined" },
  { accessorKey: "messageCount", header: "Messages" },
  { accessorKey: "lastActive", header: "Last Active" },
  {
    id: "actions",
    cell: ({ row }) => <UserActions user={row.original} />
  }
]

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <ExportButton data={users} filename="users.csv" />
      </div>
      <DataTable columns={columns} data={users} searchKey="email" />
    </div>
  )
}
```

### Conversation View

```tsx
// app/(admin)/admin/conversations/[id]/page.tsx
import { getConversation } from "@/lib/admin/conversations"
import { MessageList } from "@/components/admin/message-list"

export default async function ConversationPage({
  params
}: {
  params: { id: string }
}) {
  const conversation = await getConversation(params.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversation</h1>
          <p className="text-muted-foreground">
            {conversation.user.email} - {conversation.channel}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={conversation.messages} />
          <DeleteButton conversationId={params.id} />
        </div>
      </div>

      <MessageList messages={conversation.messages} />
    </div>
  )
}
```

## Phase 5: Channel Status

```tsx
// components/admin/channel-health.tsx
import { getChannelStatus } from "@/lib/admin/channels"

export async function ChannelHealth() {
  const channels = await getChannelStatus()

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Channel Status</h2>
      <div className="space-y-3">
        {channels.map((channel) => (
          <div key={channel.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                channel.status === "healthy" ? "bg-green-500" : "bg-red-500"
              )} />
              <span>{channel.name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {channel.messageCount} msgs today
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Data Queries

```typescript
// lib/admin/stats.ts
import { db } from "@/lib/db"
import { users, chats, messages } from "@/lib/db/schema"
import { count, sql, gte } from "drizzle-orm"

export async function getStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalUsers] = await db.select({ count: count() }).from(users)
  const [totalConversations] = await db.select({ count: count() }).from(chats)
  const [messagesToday] = await db
    .select({ count: count() })
    .from(messages)
    .where(gte(messages.createdAt, today))

  return {
    totalUsers: totalUsers.count,
    totalConversations: totalConversations.count,
    messagesToday: messagesToday.count,
    activeChannels: 3 // WhatsApp, Telegram, Web
  }
}
```

## Quick Setup with shadcn/ui

```bash
# Add required components
npx shadcn@latest add table card button input
npx shadcn@latest add dropdown-menu dialog alert

# Create data table (reusable)
npx shadcn@latest add table
```

## Checklist

- [ ] Create admin route group `(admin)`
- [ ] Add admin layout with sidebar
- [ ] Create dashboard with stats
- [ ] Add user management page
- [ ] Add conversation viewer
- [ ] Add channel status
- [ ] Protect with admin role check
- [ ] Add export functionality
- [ ] Add search/filter to tables

## Trigger Phrases

- "build admin panel"
- "create admin dashboard"
- "add admin for [project]"
- "user management page"
- "conversation viewer"
