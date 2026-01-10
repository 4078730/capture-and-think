# capture-and-think → nb Backend Migration Plan

## Overview

**Goal**: Supabaseを捨て、nbをバックエンドに移行。既存のUI/UXは維持。

**Current State**:
- Next.js 15 + Supabase (PostgreSQL)
- React Query for state management
- 23 components, working hooks pattern

**Target State**:
- Next.js 15 + nb (Markdown files)
- Same UI/UX, same hooks API
- Single user, file-based storage

---

## Phase 1: nb Adapter Layer (Foundation)

### 1.1 nb Installation & Configuration

```bash
# Install nb on server
npm install -g nb.sh
# or curl install for production

# Configure nb directory
export NB_DIR=/data/notes  # or ~/.nb
nb notebooks init home
```

**Environment Variables**:
```env
NB_DIR=/data/notes
NB_NOTEBOOK=home
```

### 1.2 Markdown Schema Design

現在のItemデータ構造をMarkdown frontmatter + contentにマッピング:

```markdown
---
id: "uuid-here"
bucket: "work"
pinned: true
status: "active"
kind: "task"
category: "Project A"
summary: "15文字要約"
auto_tags:
  - tag1
  - tag2
confidence: 0.85
triage_state: "done"
source: "pwa"
due_date: "2026-01-15"
subtasks:
  - id: "sub1"
    text: "Subtask 1"
    completed: false
    created_at: "2026-01-10T00:00:00Z"
memo: "詳細メモ"
created_at: "2026-01-10T00:00:00Z"
updated_at: "2026-01-10T00:00:00Z"
---

# メモ本文がここに入る

本文のコンテンツ...
```

### 1.3 nb Adapter Module

**File**: `src/lib/nb/adapter.ts`

```typescript
interface NbAdapter {
  // CRUD
  list(options: ListOptions): Promise<Item[]>
  get(id: string): Promise<Item | null>
  create(input: CreateItemInput): Promise<Item>
  update(id: string, data: UpdateItemInput): Promise<Item>
  delete(id: string): Promise<void>
  
  // Actions
  pin(id: string): Promise<void>
  unpin(id: string): Promise<void>
  archive(id: string): Promise<void>
  unarchive(id: string): Promise<void>
  
  // Search
  search(query: string): Promise<Item[]>
  
  // Categories
  getCategories(bucket?: string): Promise<CategoryCount[]>
}
```

**Implementation Options**:

| Option | Pros | Cons |
|--------|------|------|
| A. Direct file access | Fast, no CLI overhead | Must handle nb's index |
| B. CLI wrapper | Uses nb features | Parsing overhead |
| C. Hybrid | Best of both | Complexity |

**Recommendation**: Option A (Direct file access) with gray-matter for frontmatter parsing

---

## Phase 2: API Layer Migration

### 2.1 Replace Supabase calls with nb adapter

| Current Endpoint | Action |
|-----------------|--------|
| `GET /api/items` | → `nbAdapter.list()` |
| `POST /api/items` | → `nbAdapter.create()` |
| `GET /api/items/[id]` | → `nbAdapter.get()` |
| `PATCH /api/items/[id]` | → `nbAdapter.update()` |
| `POST /api/items/[id]/pin` | → `nbAdapter.pin()` |
| `POST /api/items/[id]/unpin` | → `nbAdapter.unpin()` |
| `POST /api/items/[id]/archive` | → `nbAdapter.archive()` |
| `POST /api/items/[id]/delete` | → `nbAdapter.delete()` |
| `GET /api/categories` | → `nbAdapter.getCategories()` |

### 2.2 API Response Format (Unchanged)

```typescript
// Keep existing response format
interface ItemsResponse {
  items: Item[]
  total: number
  limit: number
  offset: number
}
```

---

## Phase 3: Real-time Updates (Optional)

### 3.1 File Watcher

```typescript
// src/lib/nb/watcher.ts
import chokidar from 'chokidar'

export function watchNotes(nbDir: string, onChange: () => void) {
  const watcher = chokidar.watch(`${nbDir}/**/*.md`, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  })
  
  watcher
    .on('add', onChange)
    .on('change', onChange)
    .on('unlink', onChange)
    
  return watcher
}
```

### 3.2 WebSocket for Client Updates

```typescript
// Option: Use Server-Sent Events (SSE) for simplicity
// Or WebSocket via socket.io / ws
```

---

## Phase 4: Features Preservation

### 4.1 Features to Migrate

| Feature | Migration Strategy |
|---------|-------------------|
| Bucket filtering | Frontmatter field |
| Category filtering | Frontmatter field |
| Pinned items | Frontmatter field |
| Archived items | Move to `archived/` folder or status field |
| Search | Full-text search via grep or lunr.js |
| Sorting | In-memory sort after file read |
| Subtasks | YAML array in frontmatter |
| Due dates | Frontmatter field |
| AI Triage | Keep Claude API integration |
| MCP API | Maintain existing endpoints |

### 4.2 Features to Drop/Simplify

| Feature | Reason |
|---------|--------|
| Multi-user auth | Single user only |
| RLS | Not needed |
| Google Calendar sync | Keep or remove based on need |

---

## Phase 5: Migration Script

### 5.1 Data Export from Supabase

```typescript
// scripts/migrate-to-nb.ts
async function migrateToNb() {
  // 1. Fetch all items from Supabase
  const items = await supabase.from('items').select('*')
  
  // 2. For each item, create markdown file
  for (const item of items) {
    const filename = `${item.created_at.split('T')[0]}_${item.id.slice(0,8)}.md`
    const content = itemToMarkdown(item)
    await fs.writeFile(`${NB_DIR}/home/${filename}`, content)
  }
  
  // 3. Initialize nb index
  await exec('nb index reconcile')
}
```

---

## Implementation Order

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1 | Create `src/lib/nb/adapter.ts` | HIGH | 3h |
| 2 | Create `src/lib/nb/markdown.ts` (parser/serializer) | HIGH | 2h |
| 3 | Migrate `/api/items` endpoints | HIGH | 2h |
| 4 | Test with existing UI (no changes needed) | HIGH | 1h |
| 5 | Add file watcher for real-time | MEDIUM | 1h |
| 6 | Migration script | MEDIUM | 1h |
| 7 | Remove Supabase dependencies | LOW | 30min |
| 8 | Deploy & test | HIGH | 1h |

**Total Estimated Effort**: ~12 hours

---

## File Structure After Migration

```
capture-and-think/
├── src/
│   ├── lib/
│   │   ├── nb/
│   │   │   ├── adapter.ts      # NEW: nb operations
│   │   │   ├── markdown.ts     # NEW: frontmatter parser
│   │   │   ├── watcher.ts      # NEW: file watcher
│   │   │   └── types.ts        # NEW: nb-specific types
│   │   ├── supabase/           # REMOVE after migration
│   │   └── ...
│   ├── app/api/
│   │   └── items/              # UPDATE: use nb adapter
│   └── ...
├── data/
│   └── notes/                  # NEW: nb data directory
│       └── home/
│           ├── 2026-01-10_abc123.md
│           └── ...
└── ...
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | HIGH | Backup Supabase before migration |
| Performance with many files | MEDIUM | Index caching, pagination |
| Search performance | MEDIUM | Use lunr.js for client-side search |
| Concurrent writes | LOW | Single user, unlikely |

---

## Success Criteria

- [ ] All existing UI/UX preserved
- [ ] CRUD operations work via file system
- [ ] Search functionality maintained
- [ ] AI Triage still works
- [ ] MCP API endpoints functional
- [ ] Mobile-responsive UI unchanged
- [ ] Data successfully migrated from Supabase

---

## Next Steps

1. **User confirmation** on this plan
2. Start with Phase 1.3 (nb adapter)
3. Incremental migration, test at each step
