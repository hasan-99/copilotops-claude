---
name: vercel-deploy
description: Complete Vercel deployment management - handles environment variables, build settings, domains, edge functions, and troubleshooting deployment failures
---

# Vercel Deployment Expert Skill

Complete Vercel deployment automation and troubleshooting.

## Quick Deploy

### First-time Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Deploy
vercel --prod
```

## Environment Variables Management

### Set Environment Variables
```bash
# Set single variable
vercel env add DATABASE_URL

# Set for specific environments
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_API_URL preview
vercel env add NEXT_PUBLIC_API_URL development

# Set from .env file
vercel env pull .env.local  # Pull from Vercel
vercel env add < .env.production  # Push to Vercel

# Remove variable
vercel env rm DATABASE_URL
```

### Environment Variable Types
```javascript
// Build-time variables (NEXT_PUBLIC_*)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxx

// Server-side only variables
DATABASE_URL=postgres://...
API_SECRET=secret_key_here
REDIS_URL=redis://...

// Edge Runtime variables
EDGE_CONFIG=https://edge-config.vercel.com/...
```

### Sensitive Variables
```bash
# Mark as sensitive (hidden in logs)
vercel env add SECRET_KEY --sensitive

# Use Vercel CLI to manage secrets
vercel secrets add my-secret "value"
vercel secrets ls
vercel secrets rm my-secret
```

## Build Configuration

### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next",

  "functions": {
    "app/api/heavy-task/route.ts": {
      "maxDuration": 60
    }
  },

  "regions": ["iad1", "sfo1"],

  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ],

  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ],

  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ],

  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Common Deployment Fixes

### Build Failures

#### Module Not Found
```bash
# Clear cache and redeploy
vercel --force

# Check case sensitivity (Linux vs Windows)
# Wrong: import Component from './component'
# Right: import Component from './Component'

# Install missing dependencies
npm install missing-package
vercel --prod
```

#### Memory Issues
```json
// vercel.json
{
  "functions": {
    "api/heavy-route.js": {
      "maxDuration": 60,
      "memory": 3008  // Max 3008 MB
    }
  }
}
```

#### Build Command Issues
```bash
# Custom build command
vercel --build-env NODE_OPTIONS="--max-old-space-size=4096"

# Skip build if nothing changed
vercel --skip-build
```

### Environment Variable Issues

#### Variable Not Available
```javascript
// Check if variable exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Use fallback values
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Debug environment
console.log('Environment:', process.env.NODE_ENV);
console.log('Vercel ENV:', process.env.VERCEL_ENV);
```

#### Next.js Specific
```javascript
// app/api/route.ts - Server-side
const secret = process.env.API_SECRET; // ✅ Works

// app/page.tsx - Client-side
const publicKey = process.env.NEXT_PUBLIC_KEY; // ✅ Works
const secret = process.env.API_SECRET; // ❌ Undefined
```

## Domain Management

### Add Custom Domain
```bash
# Add domain to project
vercel domains add example.com

# Add with specific project
vercel domains add example.com --project my-app

# List domains
vercel domains ls

# Remove domain
vercel domains rm example.com
```

### DNS Configuration
```
# A Record (Apex domain)
@ → 76.76.21.21

# CNAME (Subdomain)
www → cname.vercel-dns.com

# Wildcard
* → cname.vercel-dns.com
```

### SSL Certificates
```bash
# Certificates are automatic, but to force renewal:
vercel certs issue example.com

# Check certificate status
vercel certs ls
```

## Edge Functions

### Edge Runtime API Route
```typescript
// app/api/edge/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime

export async function GET(request: NextRequest) {
  // Runs at the edge, closer to users
  const country = request.geo?.country || 'US';

  return new Response(JSON.stringify({
    message: `Hello from ${country}!`
  }));
}
```

### Edge Middleware
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');

  // Geo-based routing
  const country = request.geo?.country;
  if (country === 'CN') {
    return NextResponse.redirect(new URL('/cn', request.url));
  }

  return response;
}

export const config = {
  matcher: '/((?!api|_next/static|favicon.ico).*)',
};
```

## Monitoring & Logs

### View Logs
```bash
# View function logs
vercel logs

# Follow logs in real-time
vercel logs --follow

# Filter by function
vercel logs --filter api/user

# View build logs
vercel logs --build
```

### Analytics Setup
```javascript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Deployment Strategies

### Preview Deployments
```bash
# Create preview deployment
vercel

# Preview with specific branch
vercel --scope team-name

# Skip preview, go straight to production
vercel --prod --skip-preview
```

### Rollback
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Deployment Protection
```javascript
// vercel.json
{
  "github": {
    "deploymentProtection": {
      "production": {
        "enabled": true,
        "allowedUserEmails": ["admin@example.com"]
      }
    }
  }
}
```

## Performance Optimization

### Image Optimization
```jsx
import Image from 'next/image';

// Automatic optimization
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority // Load immediately
  placeholder="blur" // Show blur while loading
  blurDataURL={blurData}
/>
```

### ISR (Incremental Static Regeneration)
```typescript
// app/products/[id]/page.tsx
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map(p => ({ id: p.id }));
}
```

### Cache Configuration
```typescript
// app/api/data/route.ts
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
```

## Common Issues & Solutions

### 1. Function Timeout
```json
// vercel.json - Increase timeout
{
  "functions": {
    "app/api/slow-route/route.ts": {
      "maxDuration": 300 // 5 minutes (Pro plan)
    }
  }
}
```

### 2. CORS Issues
```typescript
// app/api/route.ts
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return Response.json({}, { headers });
}
```

### 3. Large Files
```javascript
// Use Vercel Blob Storage
import { put } from '@vercel/blob';

const blob = await put('file.pdf', file, {
  access: 'public',
});
```

### 4. Database Connections
```javascript
// Use connection pooling
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Quick Commands

When you say "deploy to Vercel", I:
1. Check vercel.json configuration
2. Verify environment variables
3. Run build locally first
4. Deploy to preview
5. Test preview URL
6. Deploy to production

When you say "fix Vercel env variables", I:
1. List current variables
2. Identify missing ones
3. Set correct values
4. Trigger redeployment
5. Verify they work

## Debug Checklist

- [ ] Build works locally: `npm run build`
- [ ] Environment variables set correctly
- [ ] Case-sensitive imports fixed
- [ ] Node version matches: `.nvmrc`
- [ ] Dependencies installed: `npm ci`
- [ ] Build command correct
- [ ] Output directory correct
- [ ] Functions within size limits
- [ ] API routes have correct exports
- [ ] Middleware configured properly