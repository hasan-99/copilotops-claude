---
name: rag
description: Build production RAG (Retrieval Augmented Generation) systems — Supabase pgvector setup, document chunking, embedding pipelines, retrieval + reranking, Claude generation with context injection. Full Next.js API route wiring.
tags: [rag, embeddings, pgvector, supabase, claude, ai, vector-search]
---

# RAG Builder

Build production-grade RAG systems on your stack: Supabase pgvector + Claude API + Next.js.

**Announce at start:** "Activating RAG builder. Let me set up your retrieval-augmented generation pipeline."

## Phase 1: Database Setup (Supabase pgvector)

### Enable pgvector Extension

```sql
-- Migration: supabase/migrations/YYYYMMDD_enable_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

### Documents Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'web', 'pdf', 'api'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
```

### Chunks Table (with embeddings)

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL,
  token_count INT,
  embedding vector(1024),  -- Voyage 4-lite default (adjust per provider, see Phase 3)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, chunk_index)
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- HNSW index for fast similarity search (better than ivfflat for < 1M rows)
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- For filtering by document
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
```

### Match Function (RPC)

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_metadata = '{}' OR dc.metadata @> filter_metadata)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Multi-tenant variant (add user_id or org_id scoping)

```sql
-- Add user_id to documents for RLS
ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE POLICY "users_read_own_docs" ON documents
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_read_own_chunks" ON document_chunks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_chunks.document_id
    AND d.user_id = auth.uid()
  )
);
```

## Phase 2: Document Chunking

### Chunking Strategy

Use **recursive character splitting** with overlap. This is the most reliable general-purpose strategy.

```typescript
// lib/rag/chunker.ts

interface ChunkOptions {
  maxTokens?: number;      // default 512
  overlapTokens?: number;  // default 50
  separators?: string[];
}

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ', ', ' ', ''];

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const {
    maxTokens = 512,
    overlapTokens = 50,
    separators = DEFAULT_SEPARATORS,
  } = options;

  // Rough token estimate: 1 token ~ 4 chars
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  return recursiveSplit(text, maxChars, overlapChars, separators);
}

function recursiveSplit(
  text: string,
  maxChars: number,
  overlapChars: number,
  separators: string[]
): string[] {
  if (text.length <= maxChars) return [text.trim()].filter(Boolean);

  const sep = separators.find(s => text.includes(s)) ?? '';
  const parts = text.split(sep);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current ? current + sep + part : part;
    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      // Keep overlap from end of previous chunk
      const overlapText = current.slice(-overlapChars);
      current = overlapText + sep + part;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Recursively split any chunks that are still too large
  return chunks.flatMap(chunk =>
    chunk.length > maxChars
      ? recursiveSplit(chunk, maxChars, overlapChars, separators.slice(1))
      : [chunk]
  );
}

// Estimate token count (use tiktoken for exact counts if needed)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Specialized chunkers

```typescript
// Markdown-aware chunking (respects headings)
export function chunkMarkdown(markdown: string, maxTokens = 512): string[] {
  const sections = markdown.split(/(?=^#{1,3} )/m);
  return sections.flatMap(section =>
    chunkText(section, { maxTokens, separators: ['\n\n', '\n', '. ', ' ', ''] })
  );
}

// Code-aware chunking (respects function boundaries)
export function chunkCode(code: string, maxTokens = 512): string[] {
  const functionPattern = /(?=(?:export\s+)?(?:async\s+)?(?:function|const|class)\s)/;
  const sections = code.split(functionPattern);
  return sections.flatMap(section =>
    chunkText(section, { maxTokens, separators: ['\n\n', '\n', ' ', ''] })
  );
}
```

## Embedding Model Landscape (March 2026)

Pick based on your needs:

| Model | Provider | Dims | Price/MTok | Best For |
|-------|----------|------|------------|----------|
| **voyage-4-large** | Voyage AI (MongoDB) | 1024 | ~$0.12 | Best retrieval quality (MoE arch) |
| **voyage-4** | Voyage AI | 1024 | ~$0.06 | Great quality, mid-size cost |
| **voyage-4-lite** | Voyage AI | 1024 | ~$0.02 | Production sweet spot (quality/cost) |
| **gemini-embedding-001** | Google | 3072 | Free tier / $0.01 | Highest MTEB score, free quota |
| **Gemini Embedding 2** | Google | 3072 | Preview | Multimodal (text+image+video+audio) |
| **text-embedding-3-small** | OpenAI | 1536 | $0.02 | Reliable, mature ecosystem |
| **text-embedding-3-large** | OpenAI | 3072 | $0.13 | Higher quality OpenAI option |
| **Cohere Embed v4** | Cohere | 1536 | $0.12 | Multimodal (text+image), 128k ctx |
| **Qwen3-Embedding-8B** | Qwen (open) | 4096 | Self-host | #1 MTEB multilingual, 32k ctx |
| **e5-small** | Microsoft (open) | 384 | Self-host | Fastest (<30ms), 100% Top-5 |

**Key insights:**
- **Voyage 4 series** has shared embedding space — you can embed docs with `voyage-4-large` and query with `voyage-4-lite` (asymmetric retrieval, saves cost)
- **Google deprecated `text-embedding-004`** in Jan 2026 — use `gemini-embedding-001` instead
- **Gemini Embedding 2** (preview) is the first production multimodal embedding — text, images, video, audio in one vector space
- All modern models support **Matryoshka embeddings** — reduce dims (e.g. 1024 -> 256) with minimal quality loss

### Recommended default: Voyage 4-lite (best value) or Gemini Embedding 001 (free tier)

## Phase 3: Embedding Pipeline

### Option A: Voyage AI (recommended for retrieval quality)

```typescript
// lib/rag/embeddings.ts

export async function generateEmbedding(
  text: string,
  inputType: 'query' | 'document' = 'query'
): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-4-lite',   // 1024 dims, fast + cheap
      input: [text],
      input_type: inputType,    // 'document' when indexing, 'query' when searching
      output_dimension: 1024,   // Can reduce to 512/256 via Matryoshka
    }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
  inputType: 'query' | 'document' = 'document'
): Promise<number[][]> {
  // Voyage supports batch embedding
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-4-lite',
      input: texts,
      input_type: inputType,
      output_dimension: 1024,
    }),
  });
  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}
```

### Option B: Google Gemini Embedding (free tier, highest MTEB)

```typescript
// lib/rag/embeddings-gemini.ts
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await genai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 1536 },  // Default 3072, can reduce to 1536/768
  });
  return response.embeddings![0].values!;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Batch embed
  const results = await Promise.all(
    texts.map(text =>
      genai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: { outputDimensionality: 1536 },
      })
    )
  );
  return results.map(r => r.embeddings![0].values!);
}
```

### Option C: OpenAI (mature, wide ecosystem support)

```typescript
// lib/rag/embeddings-openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',  // $0.02/MTok, 1536 dims
    input: text,
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,  // Up to 2048 inputs per batch
  });
  return response.data.map(d => d.embedding);
}
```

### Vector dimension by provider

```sql
-- Match your chosen provider:
embedding vector(1024)  -- Voyage 4 series (default 1024)
embedding vector(1536)  -- OpenAI text-embedding-3-small / Gemini (reduced) / Cohere Embed v4
embedding vector(3072)  -- OpenAI text-embedding-3-large / Gemini (full)
embedding vector(384)   -- e5-small (self-hosted, fastest)
```

### Ingest Pipeline

```typescript
// lib/rag/ingest.ts
import { createClient } from '@/lib/supabase/server';
import { chunkText, estimateTokens } from './chunker';
import { generateEmbeddings } from './embeddings';

export async function ingestDocument(
  title: string,
  content: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient();

  // 1. Create document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({ title, metadata, source_type: 'manual' })
    .select('id')
    .single();

  if (docError) throw docError;

  // 2. Chunk the content
  const chunks = chunkText(content, { maxTokens: 512, overlapTokens: 50 });

  // 3. Generate embeddings in batches
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(batch);

    // 4. Insert chunks with embeddings
    const rows = batch.map((chunk, j) => ({
      document_id: doc.id,
      content: chunk,
      chunk_index: i + j,
      token_count: estimateTokens(chunk),
      embedding: JSON.stringify(embeddings[j]),
    }));

    const { error } = await supabase.from('document_chunks').insert(rows);
    if (error) throw error;
  }

  return doc.id;
}
```

## Phase 4: Retrieval

### Basic Similarity Search

```typescript
// lib/rag/retrieve.ts
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from './embeddings';

export async function retrieveContext(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    filterMetadata?: Record<string, unknown>;
  } = {}
) {
  const {
    matchThreshold = 0.7,
    matchCount = 5,
    filterMetadata = {},
  } = options;

  const supabase = await createClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_metadata: filterMetadata,
  });

  if (error) throw error;
  return data as Array<{
    id: string;
    document_id: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>;
}
```

### Hybrid Search (vector + full-text)

```sql
-- Add full-text search column
ALTER TABLE document_chunks ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_chunks_fts ON document_chunks USING gin(fts);

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding vector(1024),
  match_count INT DEFAULT 5,
  keyword_weight FLOAT DEFAULT 0.3,
  semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT dc.id, 1 - (dc.embedding <=> query_embedding) AS sim
    FROM document_chunks dc
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword AS (
    SELECT dc.id, ts_rank(dc.fts, websearch_to_tsquery('english', query_text)) AS rank
    FROM document_chunks dc
    WHERE dc.fts @@ websearch_to_tsquery('english', query_text)
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(s.id, k.id) AS chunk_id,
      (COALESCE(s.sim, 0) * semantic_weight + COALESCE(k.rank, 0) * keyword_weight) AS combined_score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT dc.id, dc.document_id, dc.content, dc.metadata, c.combined_score AS score
  FROM combined c
  JOIN document_chunks dc ON dc.id = c.chunk_id
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;
```

### Reranking (optional, improves quality)

```typescript
// lib/rag/rerank.ts

export async function rerankResults(
  query: string,
  results: Array<{ content: string; [key: string]: unknown }>
): Promise<typeof results> {
  // Cohere Rerank API
  const response = await fetch('https://api.cohere.com/v2/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'rerank-v3.5',
      query,
      documents: results.map(r => r.content),
      top_n: Math.min(results.length, 5),
    }),
  });

  const data = await response.json();
  return data.results.map((r: { index: number }) => results[r.index]);
}
```

## Phase 5: Generation (Claude)

### RAG Query with Claude

```typescript
// lib/rag/generate.ts
import Anthropic from '@anthropic-ai/sdk';
import { retrieveContext } from './retrieve';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function ragQuery(
  userQuery: string,
  options: {
    systemPrompt?: string;
    matchCount?: number;
    matchThreshold?: number;
  } = {}
) {
  const {
    systemPrompt = 'You are a helpful assistant. Answer questions based on the provided context. If the context does not contain the answer, say so clearly.',
    matchCount = 5,
    matchThreshold = 0.7,
  } = options;

  // 1. Retrieve relevant context
  const context = await retrieveContext(userQuery, { matchCount, matchThreshold });

  if (context.length === 0) {
    return {
      answer: 'I could not find relevant information to answer your question.',
      sources: [],
    };
  }

  // 2. Build context block
  const contextBlock = context
    .map((c, i) => `[Source ${i + 1}] (similarity: ${c.similarity.toFixed(3)})\n${c.content}`)
    .join('\n\n---\n\n');

  // 3. Generate with Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `${systemPrompt}\n\n<context>\n${contextBlock}\n</context>`,
    messages: [{ role: 'user', content: userQuery }],
  });

  const answer = message.content[0].type === 'text' ? message.content[0].text : '';

  return {
    answer,
    sources: context.map(c => ({
      content: c.content.slice(0, 200),
      similarity: c.similarity,
      document_id: c.document_id,
    })),
    usage: message.usage,
  };
}
```

### Streaming variant

```typescript
// lib/rag/generate-stream.ts
import Anthropic from '@anthropic-ai/sdk';
import { retrieveContext } from './retrieve';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function ragQueryStream(
  userQuery: string,
  systemPrompt = 'Answer based on the provided context.',
) {
  const context = await retrieveContext(userQuery, { matchCount: 5 });

  const contextBlock = context
    .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
    .join('\n\n---\n\n');

  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `${systemPrompt}\n\n<context>\n${contextBlock}\n</context>`,
    messages: [{ role: 'user', content: userQuery }],
  });
}
```

## Phase 6: Next.js API Routes

### Chat endpoint (streaming)

```typescript
// app/api/chat/route.ts
import { ragQueryStream } from '@/lib/rag/generate-stream';

export async function POST(req: Request) {
  const { message } = await req.json();

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  const stream = await ragQueryStream(message);

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### Ingest endpoint

```typescript
// app/api/ingest/route.ts
import { ingestDocument } from '@/lib/rag/ingest';
import { z } from 'zod';

const IngestSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = IngestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const docId = await ingestDocument(
    parsed.data.title,
    parsed.data.content,
    parsed.data.metadata
  );

  return Response.json({ documentId: docId });
}
```

## Quick Start Checklist

When user asks to build RAG, follow this order:

1. **Database**: Run pgvector migration (Phase 1)
2. **Chunker**: Create `lib/rag/chunker.ts` (Phase 2)
3. **Embeddings**: Create `lib/rag/embeddings.ts` with chosen provider (Phase 3)
4. **Ingest**: Create `lib/rag/ingest.ts` (Phase 3)
5. **Retrieve**: Create `lib/rag/retrieve.ts` (Phase 4)
6. **Generate**: Create `lib/rag/generate.ts` (Phase 5)
7. **API Routes**: Wire up endpoints (Phase 6)
8. **Test**: Ingest a sample doc, query it, verify results

## Key Decisions to Ask User

- **Embedding provider**: Voyage 4-lite (best value), Gemini Embedding 001 (free tier, highest MTEB), or OpenAI (mature ecosystem)?
- **Vector dimensions**: 1024 (Voyage 4), 1536 (OpenAI/Gemini reduced), 3072 (Gemini/OpenAI full)?
- **Hybrid search**: Pure vector or vector + full-text keyword? (hybrid recommended for production)
- **Reranking**: Add Cohere rerank step? Pair Voyage with Voyage Reranker, or use Cohere rerank-v3.5?
- **Multi-tenant**: Scope documents per user/org?
- **Generation model**: Claude Sonnet 4.6 (fast + cheap) vs Opus 4.6 (highest quality)?
- **Multimodal**: Need image/video/audio embeddings? Use Gemini Embedding 2 or voyage-multimodal-3.5
- **Asymmetric retrieval**: Voyage 4 shared space lets you embed docs with large model, query with lite (saves cost)

## Environment Variables Needed

```env
# Embeddings (pick one)
VOYAGE_API_KEY=pa-...          # Voyage 4 series (recommended)
GEMINI_API_KEY=...             # Google Gemini Embedding
OPENAI_API_KEY=sk-...          # OpenAI text-embedding-3

# Generation
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Reranking
COHERE_API_KEY=...
```

## Do You Need Pinecone?

**No.** Supabase pgvector handles everything for typical RAG workloads:
- HNSW indexes for fast similarity search
- Hybrid search (vector + full-text) via SQL
- RLS for multi-tenant isolation
- No extra service, no extra cost, no vendor lock-in

**When Pinecone makes sense** (rare for Qualia projects):
- 10M+ vectors where pgvector HNSW gets slow
- Need serverless auto-scaling with zero ops
- Multi-region replication requirements
- Already paying for Pinecone in another system

For your scale (< 1M vectors per project), Supabase pgvector is the right call.

## Performance Tips

- **Chunk size**: 512 tokens is the sweet spot. Too small = noisy, too large = diluted.
- **Overlap**: 50-100 tokens prevents splitting context at chunk boundaries.
- **HNSW index**: Use `ef_construction=64, m=16` for < 1M rows. Increase for larger datasets.
- **Batch embeddings**: Always batch (up to 2048 per OpenAI call). Never embed one at a time.
- **Cache embeddings**: Store query embeddings for repeated queries.
- **Threshold tuning**: Start at 0.7, lower to 0.5 if too few results, raise to 0.8 if too noisy.

## Trigger Phrases

- "build RAG" / "set up RAG" / "create RAG pipeline"
- "vector search" / "semantic search" / "pgvector"
- "embed documents" / "embedding pipeline"
- "knowledge base" / "document Q&A" / "chat with docs"
- "retrieval augmented generation"
