# Prisma to Supabase Migration Guide

This guide shows how to migrate tRPC routers and services from Prisma to Supabase.

## Key Changes

### 1. Import Changes

**Before (Prisma)**:
```typescript
import { CredentialStatus, CredentialType, Prisma } from "@prisma/client"
import { prisma } from "../db"
```

**After (Supabase)**:
```typescript
import { Database } from "../../lib/supabase/types"
import { createAdminClient } from "../../lib/supabase/server"

// Type aliases for enums
type CredentialType = Database["public"]["Enums"]["CredentialType"]
type CredentialStatus = Database["public"]["Enums"]["CredentialStatus"]
```

### 2. Context Usage

**Before (Prisma)**:
```typescript
export const createContext = async () => {
  return {
    prisma,
    user,
  }
}
```

**After (Supabase)**:
```typescript
export const createContext = async () => {
  const supabase = await createClient()
  return {
    supabase,  // Use this for user-scoped queries (RLS applied)
    user,
  }
}
```

### 3. Query Patterns

## CREATE Operations

**Before (Prisma)**:
```typescript
await prisma.credential.create({
  data: {
    userId: user.id,
    type: input.type,
    secret: input.secret,
    status: "VALID",
  }
})
```

**After (Supabase)**:
```typescript
const { data, error } = await supabase
  .from("Credential")
  .insert({
    userId: user.id,
    type: input.type,
    secret: input.secret,
    status: "VALID",
  })
  .select()
  .single()

if (error) throw error
return data
```

## READ Operations

**Before (Prisma)**:
```typescript
// Find unique
const cred = await prisma.credential.findUnique({
  where: {
    userId_type: {
      userId,
      type,
    },
  },
})

// Find many
const creds = await prisma.credential.findMany({
  where: { userId },
})
```

**After (Supabase)**:
```typescript
// Find unique (with composite key)
const { data, error } = await supabase
  .from("Credential")
  .select("*")
  .eq("userId", userId)
  .eq("type", type)
  .single()

if (error && error.code !== "PGRST116") throw error // PGRST116 = not found
return data

// Find many
const { data, error } = await supabase
  .from("Credential")
  .select("*")
  .eq("userId", userId)

if (error) throw error
return data
```

## UPDATE Operations

**Before (Prisma)**:
```typescript
await prisma.credential.update({
  where: {
    userId_type: {
      userId,
      type,
    },
  },
  data: {
    secret: newSecret,
    status: "VALID",
  },
})
```

**After (Supabase)**:
```typescript
const { data, error } = await supabase
  .from("Credential")
  .update({
    secret: newSecret,
    status: "VALID",
  })
  .eq("userId", userId)
  .eq("type", type)
  .select()
  .single()

if (error) throw error
return data
```

## UPSERT Operations

**Before (Prisma)**:
```typescript
await prisma.credential.upsert({
  where: {
    userId_type: {
      userId,
      type,
    },
  },
  update: {
    secret: input.secret,
    status: input.status,
  },
  create: {
    userId,
    type,
    secret: input.secret,
    status: input.status,
  },
})
```

**After (Supabase)**:
```typescript
// Supabase upsert (requires unique constraint)
const { data, error } = await supabase
  .from("Credential")
  .upsert({
    userId,
    type,
    secret: input.secret,
    status: input.status,
  }, {
    onConflict: "userId,type",
  })
  .select()
  .single()

if (error) throw error
return data
```

## DELETE Operations

**Before (Prisma)**:
```typescript
await prisma.credential.delete({
  where: {
    userId_type: {
      userId,
      type,
    },
  },
})
```

**After (Supabase)**:
```typescript
const { error } = await supabase
  .from("Credential")
  .delete()
  .eq("userId", userId)
  .eq("type", type)

if (error) throw error
```

## Example: Complete Service Migration

### Before (credentials.ts with Prisma):

```typescript
import { CredentialStatus, CredentialType, Prisma } from "@prisma/client"
import { prisma } from "../db"
import { logger } from "../logger"

export interface UpsertCredentialInput {
  userId: string
  type: CredentialType
  secret: string
  status: CredentialStatus
  metadata?: Prisma.InputJsonValue
  validationMessage?: string | null
}

export async function upsertCredential(input: UpsertCredentialInput) {
  logger.info("Persisting credential", { type: input.type, userId: input.userId })

  return prisma.credential.upsert({
    where: {
      userId_type: {
        userId: input.userId,
        type: input.type,
      },
    },
    update: {
      secret: input.secret,
      status: input.status,
      metadata: input.metadata,
      validationMessage: input.validationMessage,
      lastValidatedAt: new Date(),
    },
    create: {
      userId: input.userId,
      type: input.type,
      secret: input.secret,
      status: input.status,
      metadata: input.metadata,
      validationMessage: input.validationMessage,
      lastValidatedAt: new Date(),
    },
  })
}

export async function getCredential(userId: string, type: CredentialType) {
  logger.debug("Fetching credential", { type, userId })

  return prisma.credential.findUnique({
    where: {
      userId_type: {
        userId,
        type,
      },
    },
  })
}
```

### After (credentials.ts with Supabase):

```typescript
import { Database } from "../../lib/supabase/types"
import { createAdminClient } from "../../lib/supabase/server"
import { logger } from "../logger"

type CredentialType = Database["public"]["Enums"]["CredentialType"]
type CredentialStatus = Database["public"]["Enums"]["CredentialStatus"]
type Json = Database["public"]["Tables"]["Credential"]["Row"]["metadata"]

export interface UpsertCredentialInput {
  userId: string
  type: CredentialType
  secret: string
  status: CredentialStatus
  metadata?: Json
  validationMessage?: string | null
}

export async function upsertCredential(input: UpsertCredentialInput) {
  logger.info("Persisting credential", { type: input.type, userId: input.userId })

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("Credential")
    .upsert({
      userId: input.userId,
      type: input.type,
      secret: input.secret,
      status: input.status,
      metadata: input.metadata,
      validationMessage: input.validationMessage,
      lastValidatedAt: new Date().toISOString(),
    }, {
      onConflict: "userId,type",
    })
    .select()
    .single()

  if (error) {
    logger.error("Failed to upsert credential", { error, input })
    throw error
  }

  return data
}

export async function getCredential(userId: string, type: CredentialType) {
  logger.debug("Fetching credential", { type, userId })

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("Credential")
    .select("*")
    .eq("userId", userId)
    .eq("type", type)
    .single()

  // PGRST116 = not found, which is not an error in this case
  if (error && error.code !== "PGRST116") {
    logger.error("Failed to get credential", { error, userId, type })
    throw error
  }

  return data
}

export async function requireCredential(userId: string, type: CredentialType) {
  const credential = await getCredential(userId, type)

  if (!credential || credential.status !== "VALID") {
    throw new Error(`Credential ${type} is missing or invalid`)
  }

  return credential
}
```

## Router Updates

### Update Imports in Router Files

**Before**:
```typescript
import { CredentialType, CredentialStatus } from "@prisma/client"
import { router, publicProcedure } from "../trpc"
```

**After**:
```typescript
import { Database } from "../../../lib/supabase/types"
import { router, publicProcedure } from "../trpc"

type CredentialType = Database["public"]["Enums"]["CredentialType"]
type CredentialStatus = Database["public"]["Enums"]["CredentialStatus"]
```

### Use Context Supabase Client

**Before**:
```typescript
.mutation(async ({ ctx, input }) => {
  const { prisma, user } = ctx
  await prisma.credential.create({ ... })
})
```

**After**:
```typescript
.mutation(async ({ ctx, input }) => {
  const { supabase, user } = ctx
  const { data, error } = await supabase
    .from("Credential")
    .insert({ ... })
  if (error) throw error
})
```

## Files to Migrate

1. ✅ `src/server/api/trpc.ts` - Context updated
2. ✅ `src/server/db.ts` - Exports updated
3. ⏳ `src/server/services/credentials.ts` - Needs migration
4. ⏳ `src/server/api/routers/credential.ts` - Needs enum import update
5. ⏳ `src/server/api/routers/entity.ts` - Needs migration
6. ⏳ `src/server/api/routers/migration.ts` - Needs migration
7. ⏳ `src/server/api/routers/selection.ts` - Already deprecated (uses local state)

## Testing After Migration

1. **Check Types**: Run `npm run build` to catch type errors
2. **Test Auth**: Sign in with Google/GitHub in production
3. **Test CRUD**: Create, read, update, delete operations for each entity
4. **Test RLS**: Verify users can only access their own data
5. **Test Dev Mode**: Ensure dev bypass works locally

## Common Issues

### Issue: "relation does not exist"

**Cause**: Table name case mismatch

**Solution**: Use exact table names from schema (e.g., `"Credential"` not `"credential"`)

### Issue: "new row violates row-level security policy"

**Cause**: Missing or incorrect RLS policy

**Solution**: Check Supabase > Table Editor > RLS policies

### Issue: Type errors with enums

**Cause**: Using Prisma enum types instead of Supabase types

**Solution**: Import from `Database["public"]["Enums"]`

### Issue: PGRST116 error

**Cause**: Record not found (this is expected for some queries)

**Solution**: Handle gracefully:
```typescript
if (error && error.code !== "PGRST116") throw error
```

## Migration Checklist

- [x] Create Supabase project and run migrations
- [x] Install Supabase dependencies
- [x] Create Supabase client utilities
- [x] Update tRPC context
- [x] Add auth middleware and dev bypass
- [ ] Migrate credential service
- [ ] Migrate entity router
- [ ] Migrate migration router
- [ ] Update all enum imports
- [ ] Test all CRUD operations
- [ ] Deploy to Vercel
- [ ] Remove Prisma dependencies
