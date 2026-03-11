# NestJS Backend Skill

A comprehensive, reusable skill for NestJS backend development. Use this skill when working on NestJS API servers, creating endpoints, services, guards, middleware, or any backend logic.

## Contents

- **SKILL.md** — Core NestJS patterns and architecture guidelines (446 lines)
  - Project structure with modular design
  - Controller, service, and DTO patterns
  - Error handling, guards, and interceptors
  - Database integration with Supabase
  - Testing strategies
  - Configuration management
  - Idempotency and best practices

- **references/templates.md** — Production-quality code templates (1173 lines)
  - Complete feature module example (module + controller + service + DTO + tests)
  - Global exception filter
  - Auth guard with JWT validation
  - Roles guard with decorators
  - Request ID interceptor for tracing
  - Zod validation pipe
  - Supabase database service wrapper
  - Config module with startup validation
  - Current user decorator
  - Logging service

## Usage

This skill is designed to be injected into planning documents via the Qualia/GSD workflow:

```
@context ./nestjs-backend/SKILL.md
```

The skill teaches Claude:
- Standard NestJS module structure and patterns
- How to organize code across controllers, services, and DTOs
- Proper error handling and validation
- Authentication and authorization patterns
- Database integration patterns with Supabase
- Testing approaches

## Key Principles

1. **Thin Controllers** — Controllers validate input and delegate to services
2. **Business Logic in Services** — All domain logic lives in services for testability
3. **Zod DTOs** — Use Zod schemas for type-safe validation shared across frontend/backend
4. **Global Error Handling** — Domain exceptions convert to standardized HTTP responses
5. **Supabase Integration** — RLS enforced at DB level, service layer validates access
6. **Request Tracing** — Request IDs propagated for debugging and monitoring

## Templates

All templates in `references/templates.md` are:
- Production-quality, not toy examples
- Ready to copy and adapt
- Integrated with Supabase
- Following NestJS best practices
- Fully typed with TypeScript

## When to Use This Skill

Trigger this skill when working on:
- NestJS applications or API servers
- Creating new endpoints or controllers
- Building services with business logic
- Implementing authentication/authorization
- Setting up guards, interceptors, or middleware
- Creating DTOs and validating input
- Integrating with Supabase database
- Error handling and exception filtering
- Configuration management
