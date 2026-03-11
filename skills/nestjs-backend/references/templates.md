# NestJS Backend Templates

Production-quality starter templates for common NestJS patterns. All templates use Supabase as the database and Zod for validation.

---

## 1. Complete Feature Module

Full working example of a feature module with all layers (module, controller, service, DTO, spec).

### building.module.ts

```typescript
import { Module } from '@nestjs/common';
import { BuildingController } from './controllers/building.controller';
import { BuildingService } from './services/building.service';
import { SupabaseService } from '../database/supabase.service';
import { LoggerService } from '../logger/logger.service';

@Module({
  controllers: [BuildingController],
  providers: [BuildingService, SupabaseService, LoggerService],
  exports: [BuildingService],
})
export class BuildingModule {}
```

### controllers/building.controller.ts

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BuildingService } from '../services/building.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtPayload } from '../../common/types/jwt.types';
import {
  CreateBuildingDtoSchema,
  CreateBuildingDto,
} from '../dtos/create-building.dto';
import {
  UpdateBuildingDtoSchema,
  UpdateBuildingDto,
} from '../dtos/update-building.dto';

@Controller('buildings')
@UseGuards(AuthGuard)
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateBuildingDtoSchema))
    dto: CreateBuildingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const building = await this.buildingService.create(dto, user.id);
    return { data: building };
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const buildings = await this.buildingService.findByOwner(user.id);
    return { data: buildings };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const building = await this.buildingService.findById(id, user.id);
    return { data: building };
  }

  @Post(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBuildingDtoSchema))
    dto: UpdateBuildingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const building = await this.buildingService.update(id, dto, user.id);
    return { data: building };
  }
}
```

### services/building.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { LoggerService } from '../../logger/logger.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import {
  CreateBuildingDto,
} from '../dtos/create-building.dto';
import {
  UpdateBuildingDto,
} from '../dtos/update-building.dto';
import { Building } from '../entities/building.entity';

@Injectable()
export class BuildingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateBuildingDto, userId: string): Promise<Building> {
    // Validate business rules
    const { count, error: countError } = await this.supabase
      .from('buildings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (countError) {
      this.logger.error('Failed to count buildings', { error: countError });
      throw new DomainException('INTERNAL_ERROR');
    }

    if (count >= 100) {
      throw new DomainException('MAX_BUILDINGS_EXCEEDED', {
        limit: 100,
        current: count,
      });
    }

    // Create record
    const { data, error } = await this.supabase
      .from('buildings')
      .insert([
        {
          ...dto,
          owner_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create building', { error, dto, userId });
      throw new DomainException('BUILDING_CREATE_FAILED', {
        reason: error.message,
      });
    }

    this.logger.info('Building created', { id: data.id, owner_id: userId });
    return data;
  }

  async findByOwner(userId: string): Promise<Building[]> {
    const { data, error } = await this.supabase
      .from('buildings')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch buildings', { error, userId });
      throw new DomainException('INTERNAL_ERROR');
    }

    return data ?? [];
  }

  async findById(id: string, userId?: string): Promise<Building> {
    const query = this.supabase
      .from('buildings')
      .select('*')
      .eq('id', id);

    if (userId) {
      query.eq('owner_id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new DomainException('BUILDING_NOT_FOUND', { id });
    }

    return data;
  }

  async update(
    id: string,
    dto: UpdateBuildingDto,
    userId: string,
  ): Promise<Building> {
    // Verify ownership
    await this.findById(id, userId);

    const { data, error } = await this.supabase
      .from('buildings')
      .update(dto)
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update building', { error, id, userId });
      throw new DomainException('BUILDING_UPDATE_FAILED');
    }

    this.logger.info('Building updated', { id, owner_id: userId });
    return data;
  }
}
```

### dtos/create-building.dto.ts

```typescript
import { z } from 'zod';

export const CreateBuildingDtoSchema = z.object({
  nameAr: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  buildingType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'MIXED']),
  unitCount: z.number().int().positive().max(10000),
  address: z.string().min(1).max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateBuildingDto = z.infer<typeof CreateBuildingDtoSchema>;
```

### dtos/update-building.dto.ts

```typescript
import { z } from 'zod';

export const UpdateBuildingDtoSchema = z.object({
  nameAr: z.string().min(1).max(200).optional(),
  nameEn: z.string().min(1).max(200).optional(),
  buildingType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'MIXED']).optional(),
  unitCount: z.number().int().positive().max(10000).optional(),
  address: z.string().min(1).max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type UpdateBuildingDto = z.infer<typeof UpdateBuildingDtoSchema>;
```

### entities/building.entity.ts

```typescript
export interface Building {
  id: string;
  owner_id: string;
  nameAr: string;
  nameEn: string;
  buildingType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';
  unitCount: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}
```

### __tests__/building.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BuildingService } from '../services/building.service';
import { SupabaseService } from '../../database/supabase.service';
import { LoggerService } from '../../logger/logger.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { CreateBuildingDto } from '../dtos/create-building.dto';

describe('BuildingService', () => {
  let service: BuildingService;
  let mockSupabase: jest.Mocked<SupabaseService>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    mockSupabase = {
      from: jest.fn(),
    } as any;

    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<BuildingService>(BuildingService);
  });

  describe('create', () => {
    it('should create a building successfully', async () => {
      const dto: CreateBuildingDto = {
        nameAr: 'مبنى تجريبي',
        nameEn: 'Test Building',
        buildingType: 'RESIDENTIAL',
        unitCount: 20,
        address: '123 Main St',
      };

      const mockResult = {
        id: '1',
        owner_id: 'user-1',
        ...dto,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({ count: 0, error: null }),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
      } as any);

      const result = await service.create(dto, 'user-1');
      expect(result.id).toBe('1');
      expect(result.nameEn).toBe('Test Building');
    });

    it('should throw DomainException if max buildings exceeded', async () => {
      const dto: CreateBuildingDto = {
        nameAr: 'مبنى',
        nameEn: 'Building',
        buildingType: 'RESIDENTIAL',
        unitCount: 10,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({ count: 100, error: null }),
      } as any);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('findById', () => {
    it('should find a building by id', async () => {
      const mockBuilding = { id: '1', nameEn: 'Test', owner_id: 'user-1' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBuilding, error: null }),
      } as any);

      const result = await service.findById('1', 'user-1');
      expect(result.id).toBe('1');
    });

    it('should throw DomainException if building not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      } as any);

      await expect(service.findById('999', 'user-1')).rejects.toThrow(
        DomainException,
      );
    });
  });
});
```

---

## 2. Global Exception Filter

Centralized error handling that converts domain exceptions to HTTP responses.

### common/filters/exception.filter.ts

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { LoggerService } from '../../logger/logger.service';

interface ErrorResponse {
  http_status: number;
  error_code: string;
  message_key: string;
  request_id: string;
  details?: Record<string, any>;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const requestId = request.id || 'unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let messageKey = 'error.internal_error';
    let details: Record<string, any> | undefined;

    // Handle domain exceptions
    if (exception instanceof DomainException) {
      ({ statusCode, errorCode, messageKey, details } =
        this.handleDomainException(exception));
      this.logger.warn('Domain exception', {
        errorCode,
        details,
        requestId,
        path: request.path,
      });
    }
    // Handle validation errors (Zod)
    else if (exception instanceof BadRequestException) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorCode = 'VALIDATION_FAILED';
      messageKey = 'error.validation_failed';
      const errorResponse = exception.getResponse();
      if (typeof errorResponse === 'object' && 'message' in errorResponse) {
        details = (errorResponse as any).message;
      }
      this.logger.warn('Validation error', {
        details,
        requestId,
        path: request.path,
      });
    }
    // Handle generic errors
    else {
      this.logger.error('Unhandled exception', {
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        requestId,
        path: request.path,
      });
    }

    const errorResponse: ErrorResponse = {
      http_status: statusCode,
      error_code: errorCode,
      message_key: messageKey,
      request_id: requestId,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }

  private handleDomainException(
    exception: DomainException,
  ): {
    statusCode: number;
    errorCode: string;
    messageKey: string;
    details?: Record<string, any>;
  } {
    const statusMap: Record<string, number> = {
      NOT_FOUND: HttpStatus.NOT_FOUND,
      UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
      FORBIDDEN: HttpStatus.FORBIDDEN,
      VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
      CONFLICT: HttpStatus.CONFLICT,
      INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
      MAX_BUILDINGS_EXCEEDED: HttpStatus.BAD_REQUEST,
      BUILDING_CREATE_FAILED: HttpStatus.BAD_REQUEST,
      BUILDING_UPDATE_FAILED: HttpStatus.BAD_REQUEST,
      BUILDING_NOT_FOUND: HttpStatus.NOT_FOUND,
    };

    const statusCode = statusMap[exception.code] || HttpStatus.INTERNAL_SERVER_ERROR;
    const messageKey = `error.${exception.code.toLowerCase()}`;

    return {
      statusCode,
      errorCode: exception.code,
      messageKey,
      details: exception.details,
    };
  }
}
```

### common/exceptions/domain.exception.ts

```typescript
export class DomainException extends Error {
  constructor(
    public readonly code: string,
    public readonly details?: Record<string, any>,
  ) {
    super(`Domain error: ${code}`);
    this.name = 'DomainException';
  }
}
```

### app.module.ts (register filter)

```typescript
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { LoggerService } from './logger/logger.service';

@Module({
  imports: [/* ... */],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    LoggerService,
  ],
})
export class AppModule {}
```

---

## 3. Auth Guard with JWT Validation

Validates JWT token and attaches user to request.

### common/guards/auth.guard.ts

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/jwt.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization scheme');
    }

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = jwt.verify(token, secret) as JwtPayload;

      request.user = payload;
      request.id = request.headers['x-request-id'] as string;
      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Unauthorized');
    }
  }
}
```

### common/types/jwt.types.ts

```typescript
export interface JwtPayload {
  sub: string; // user ID
  id: string; // user ID (duplicate for compatibility)
  email: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      id?: string; // request ID
    }
  }
}
```

---

## 4. Roles Guard with Decorator

Checks user role against @Roles() decorator on method.

### common/guards/roles.guard.ts

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

### common/decorators/roles.decorator.ts

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### Usage in controller

```typescript
@Post()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
async create(@Body() dto: CreateDto) {
  // Only authenticated admins/managers reach here
}
```

---

## 5. Request ID Interceptor

Generates or propagates a unique request_id UUID for tracing.

### common/interceptors/request-id.interceptor.ts

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Use existing request ID or generate new one
    const requestId =
      (request.headers['x-request-id'] as string) || uuidv4();

    request.id = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
```

### app.module.ts (register interceptor)

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
  ],
})
export class AppModule {}
```

---

## 6. Zod Validation Pipe

Validates request body against Zod schema.

### common/pipes/zod-validation.pipe.ts

```typescript
import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      const parsed = this.schema.parse(value);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formatted,
        });
      }
      throw error;
    }
  }
}
```

### Usage in controller

```typescript
@Post()
async create(
  @Body(new ZodValidationPipe(CreateBuildingDtoSchema))
  dto: CreateBuildingDto,
) {
  return { data: await this.buildingService.create(dto) };
}
```

---

## 7. Supabase Database Service

Wrapper around Supabase client with RLS and transaction support.

### database/supabase.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.client = createClient(url, key);
  }

  /**
   * Get typed access to a table
   * Usage: this.supabase.from('buildings').select('*')
   */
  from<T = any>(table: string) {
    return this.client.from<T>(table);
  }

  /**
   * Execute a stored procedure (for transactions)
   * Usage: this.supabase.rpc('my_function', { arg1: 'value' })
   */
  rpc(name: string, params?: Record<string, any>) {
    return this.client.rpc(name, params);
  }

  /**
   * Direct access to client for advanced operations
   */
  getClient() {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('_supabase_migrations').select('id').limit(1);
      if (error) {
        this.logger.warn('Supabase health check failed', { error });
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Supabase health check exception', { error });
      return false;
    }
  }
}
```

### Usage in services

```typescript
// Select query
const { data, error } = await this.supabase
  .from('buildings')
  .select('*')
  .eq('owner_id', userId);

// Insert
const { data, error } = await this.supabase
  .from('buildings')
  .insert([{ nameEn: 'Test', owner_id: userId }])
  .select()
  .single();

// Update
const { data, error } = await this.supabase
  .from('buildings')
  .update({ nameEn: 'Updated' })
  .eq('id', buildingId)
  .select()
  .single();

// Transaction via stored procedure
const { data, error } = await this.supabase.rpc('create_building_with_units', {
  p_owner_id: userId,
  p_name_en: 'Test',
  p_unit_count: 10,
});
```

---

## 8. Config Module with Zod Validation

Centralized configuration with startup validation.

### config/configuration.ts

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().pipe(z.coerce.number()).default('3000'),

  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Features
  FEATURE_BUILDING_VERIFICATION: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
});

export type Environment = z.infer<typeof envSchema>;

export const validateConfig = (config: Record<string, unknown>): Environment => {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Configuration validation failed: ${formatted}`);
    }
    throw error;
  }
};

export default () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },
  logging: {
    level: process.env.LOG_LEVEL,
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
  features: {
    buildingVerification: process.env.FEATURE_BUILDING_VERIFICATION === 'true',
  },
});
```

### config/config.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration, { validateConfig } from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [configuration],
      validate: validateConfig,
      isGlobal: true,
      expandVariables: true,
    }),
  ],
})
export class ConfigModule {}
```

### app.module.ts (import config)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { BuildingModule } from './modules/building/building.module';

@Module({
  imports: [ConfigModule, BuildingModule],
})
export class AppModule {}
```

### Usage in services

```typescript
import { ConfigService } from '@nestjs/config';
import { Environment } from '../config/configuration';

constructor(private readonly configService: ConfigService<Environment>) {}

someMethod() {
  const secret = this.configService.get('JWT_SECRET');
  const supabaseUrl = this.configService.get('SUPABASE_URL');
  const isFeatureEnabled = this.configService.get('FEATURE_BUILDING_VERIFICATION');
}
```

---

## 9. Current User Decorator

Extracts authenticated user from request.

### common/decorators/current-user.decorator.ts

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
```

### Usage in controller

```typescript
@Get()
async getProfile(@CurrentUser() user: JwtPayload) {
  return { data: { id: user.id, email: user.email } };
}
```

---

## 10. Logging Service

Structured logging with request tracing.

### logger/logger.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

@Injectable()
export class LoggerService {
  private logLevel: LogLevel = LogLevel.INFO;

  constructor(private readonly configService: ConfigService) {
    const level = this.configService.get<string>('LOG_LEVEL');
    if (level) {
      this.logLevel = level as LogLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(
        JSON.stringify({
          level: 'debug',
          timestamp: new Date().toISOString(),
          message,
          ...context,
        }),
      );
    }
  }

  info(message: string, context?: Record<string, any>) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(
        JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          message,
          ...context,
        }),
      );
    }
  }

  warn(message: string, context?: Record<string, any>) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          timestamp: new Date().toISOString(),
          message,
          ...context,
        }),
      );
    }
  }

  error(message: string, context?: Record<string, any>) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(
        JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          message,
          ...context,
        }),
      );
    }
  }
}
```

---

All templates are production-ready and follow NestJS best practices. Adapt to your specific needs while maintaining the architectural patterns.
