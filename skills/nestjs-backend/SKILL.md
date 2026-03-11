---
name: nestjs-backend
description: "NestJS backend development patterns — module/controller/service architecture, guards, interceptors, DTOs with Zod, error handling, database integration, and API design. Use whenever building or modifying a NestJS API server, creating endpoints, services, guards, middleware, or any backend logic in a NestJS application. Triggers on: NestJS, API endpoint, controller, service, guard, interceptor, DTO, middleware, backend module, REST API server."
tags: [nestjs, backend, api, typescript]
---

# NestJS Backend Skill

## Project Structure

Standard NestJS modular structure with feature modules:

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── decorators/         # Custom decorators (@CurrentUser, @Roles, @IdempotencyKey)
│   ├── filters/            # Exception filters (global error handler)
│   ├── guards/             # Auth guard, Role guard, Subscription guard
│   ├── interceptors/       # Request ID, Logging, Transform response
│   ├── middleware/         # Correlation ID middleware
│   ├── pipes/              # Zod validation pipe
│   └── types/              # Shared interfaces
├── modules/
│   ├── auth/               # Auth module (OTP, tokens, sessions)
│   ├── building/           # Building CRUD + verification
│   ├── unit/               # Unit CRUD + claims
│   └── [feature]/          # Feature modules
├── config/                 # Configuration module with validation
└── database/               # Supabase client and RLS utilities
```

## Module Pattern

Every feature module follows a consistent structure:

- **module.ts**: Registers controllers and providers
- **controller.ts**: HTTP layer — validates input, delegates to service, returns response
- **service.ts**: Business logic — domain operations, database queries, validation
- **dto/**: Data Transfer Objects with Zod schemas
- **entities/**: TypeScript interfaces for database tables
- **spec.ts**: Unit and integration tests

Controllers are thin (validate + delegate). Services contain all business logic and are testable in isolation.

## Controller Pattern

Controllers handle HTTP concerns only — request validation, response formatting, and delegation.

**Guidelines:**
- Validate input using Zod validation pipe
- Use decorators for authentication (@UseGuards, @Roles)
- Call service methods and return results
- Let global exception filter handle errors
- Response shape is always: `{ data: T }` for success, errors via exception filter

**Example structure:**
```typescript
@Controller('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Body() dto: CreateBuildingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return {
      data: await this.buildingService.create(dto, user.id),
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return {
      data: await this.buildingService.findById(id),
    };
  }
}
```

## Service Pattern

Services contain all business logic, database operations, and domain-specific validation.

**Guidelines:**
- Inject dependencies (database client, other services)
- All queries and mutations happen here
- Throw domain exceptions, never HTTP exceptions
- Services are testable in isolation with mocked dependencies
- Use transactions for multi-step operations
- Validate business rules before state changes

**Example structure:**
```typescript
@Injectable()
export class BuildingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateBuildingDto, userId: string) {
    // Validate business rules
    const existingCount = await this.supabase
      .from('buildings')
      .select('id')
      .eq('owner_id', userId)
      .count('exact');

    if (existingCount >= 10) {
      throw new DomainException('MAX_BUILDINGS_EXCEEDED', {
        limit: 10,
        current: existingCount,
      });
    }

    // Create record
    const { data, error } = await this.supabase
      .from('buildings')
      .insert([{ ...dto, owner_id: userId }])
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create building', { error, dto });
      throw new DomainException('BUILDING_CREATE_FAILED');
    }

    return data;
  }

  async findById(id: string, userId?: string) {
    const query = this.supabase
      .from('buildings')
      .select('*')
      .eq('id', id);

    if (userId) {
      query.eq('owner_id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new DomainException('BUILDING_NOT_FOUND');
    }

    return data;
  }
}
```

## DTO Pattern with Zod

DTOs are derived from Zod schemas for type-safe validation across the stack.

**Guidelines:**
- Define Zod schemas in separate files
- Export both schema and inferred type
- Use shared DTO packages in monorepos (frontend + backend)
- Zod validates at controller layer via ZodValidationPipe
- DTOs are plain objects, not class-validator decorators

**Example DTO file:**
```typescript
// dtos/create-building.dto.ts
import { z } from 'zod';

export const CreateBuildingDtoSchema = z.object({
  nameAr: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  buildingType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'MIXED']),
  unitCount: z.number().int().positive().max(1000),
  address: z.string().optional(),
});

export type CreateBuildingDto = z.infer<typeof CreateBuildingDtoSchema>;
```

**Usage in controller:**
```typescript
@Post()
async create(
  @Body(new ZodValidationPipe(CreateBuildingDtoSchema))
  dto: CreateBuildingDto,
) {
  return { data: await this.buildingService.create(dto) };
}
```

## Error Handling

A global exception filter standardizes all error responses.

**Guidelines:**
- Services throw DomainException (never HttpException)
- Global filter catches all exceptions and formats them
- Error responses include: HTTP status, error_code, message_key, request_id
- Never expose internal details (stack traces, SQL errors, database column names)
- Log errors server-side for debugging, send safe messages to client

**Error response shape:**
```typescript
{
  http_status: 400,
  error_code: "VALIDATION_FAILED",
  message_key: "error.validation_failed",
  request_id: "req_abc123",
  details: { field: "nameAr", reason: "too_short" }
}
```

**Exception mapping:**
```
DomainException codes:
  NOT_FOUND → 404
  UNAUTHORIZED → 401
  FORBIDDEN → 403
  VALIDATION_FAILED → 400
  CONFLICT → 409
  INTERNAL_ERROR → 500
```

## Guards

Guards enforce authentication and authorization at the controller method level.

**AuthGuard:** Validates JWT token and attaches user to request.

**RolesGuard:** Checks user role against @Roles() decorator on method.

**SubscriptionGuard:** For gated features, validates subscription status before execution.

Usage:
```typescript
@Post()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
async create(@Body() dto: CreateDto) {
  // Only authenticated admins/managers reach here
}
```

## Interceptors

Interceptors handle cross-cutting concerns around request/response handling.

**RequestIdInterceptor:** Generates or propagates a unique request_id UUID for tracing.

**LoggingInterceptor:** Logs request and response details (timing, status) — no PII.

**TransformInterceptor:** Wraps all responses in `{ data: T }` envelope and adds metadata.

Usage:
```typescript
// In app.module.ts
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: RequestIdInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: TransformInterceptor,
  },
];
```

## Database Integration

Supabase is the primary database with RLS (Row-Level Security) policies enforced at the database layer.

**Guidelines:**
- Inject SupabaseService to access client
- Use `@supabase/supabase-js` for type-safe queries
- RLS enforced at DB level; service layer adds application-level checks
- Transactions via stored procedures or `.rpc()` for atomic operations
- Always handle errors gracefully and log server-side

**Example service:**
```typescript
async findByOwner(userId: string) {
  const { data, error } = await this.supabase
    .from('buildings')
    .select('*')
    .eq('owner_id', userId);

  if (error) {
    this.logger.error('Supabase query failed', { error, userId });
    throw new DomainException('INTERNAL_ERROR');
  }

  return data ?? [];
}
```

## Testing

Tests are colocated with source files and follow NestJS testing patterns.

**Unit tests for services:**
- Mock Supabase client
- Test business logic in isolation
- Mock other service dependencies

**Integration tests for controllers:**
- Use `supertest` for HTTP testing
- Create test module with real/mocked dependencies
- Test full request/response cycle

**Test file naming:** `*.spec.ts` next to source file.

**Example service test:**
```typescript
describe('BuildingService', () => {
  let service: BuildingService;
  let mockSupabase: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      }),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        BuildingService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get(BuildingService);
  });

  it('should create a building', async () => {
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: { id: '1', nameAr: 'Test' },
      error: null,
    });

    const result = await service.create({ nameAr: 'Test' });
    expect(result.id).toBe('1');
  });
});
```

## Idempotency Pattern

For financial or state-changing operations, idempotency keys prevent duplicate processing.

**Implementation:**
```typescript
async createWithIdempotency(
  dto: CreateDto,
  idempotencyKey: string,
) {
  // Check if request already processed
  const existing = await this.findByIdempotencyKey(idempotencyKey);
  if (existing) return existing; // Return original result

  // Create new record with idempotency_key
  const result = await this.create(dto);
  await this.saveIdempotencyKey(idempotencyKey, result.id);
  return result;
}
```

**Client usage:**
```typescript
@Post()
async create(
  @Body() dto: CreateDto,
  @IdempotencyKey() key: string,
) {
  return {
    data: await this.service.createWithIdempotency(dto, key),
  };
}
```

## Configuration

Configuration is centralized in a Config module with Zod schema validation.

**Guidelines:**
- Validate all env vars at startup (fail fast on misconfiguration)
- Use Zod for schema validation
- Typed access via ConfigService
- Store sensitive values in environment only

**Example:**
```typescript
const envSchema = z.object({
  PORT: z.string().pipe(z.coerce.number()).default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export type Environment = z.infer<typeof envSchema>;
```

## Best Practices

**Code Organization:**
- One class per file
- Controllers handle HTTP only
- Services handle business logic
- DTOs in separate folder with Zod schemas

**Error Handling:**
- Never expose stack traces or internal errors to client
- Log errors server-side for debugging
- Use domain exceptions for business rule violations
- Map domain exceptions to HTTP status codes in filter

**Security:**
- Validate all inputs with Zod
- Use guards for authentication and authorization
- RLS policies enforced at database layer
- Never trust client data

**Performance:**
- Use request ID for tracing
- Log timing for slow queries
- Lazy-load modules with dynamic imports
- Use caching for read-heavy operations

**Testing:**
- Unit test services with mocked dependencies
- Integration test controllers with test database
- Aim for 70%+ coverage on business logic
- Test error paths, not just happy paths
