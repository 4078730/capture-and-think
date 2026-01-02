# MCP API リファレンス

## 認証

すべてのエンドポイントは `Authorization: Bearer <API_KEY>` ヘッダーが必要です。
APIキーは `ct_` で始まる形式です。

---

## エンドポイント一覧

### アイテム管理

#### GET /api/mcp/items
アイテム一覧を取得します。

**Query Parameters:**
- `status` (string, optional): `active` または `archived` (デフォルト: `active`)
- `bucket` (string, optional): プロジェクトでフィルタリング
- `category` (string, optional): カテゴリでフィルタリング
- `pinned` (string, optional): `true` でピン留めされたアイテムのみ
- `due_date` (string, optional): 期限日でフィルタリング (YYYY-MM-DD)
- `sort` (string, optional): ソート順 (`newest`, `oldest`, `due_date`, `pinned_first`, `bucket`)
- `limit` (number, optional): 取得件数 (デフォルト: 20)
- `offset` (number, optional): オフセット (デフォルト: 0)

**Response:**
```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

#### POST /api/mcp/items
新しいアイテムを作成します。

**Request Body:**
```json
{
  "body": "メモの内容",
  "bucket": "management",
  "due_date": "2024-12-31",
  "memo": "メモ",
  "summary": "タイトル",
  "adf_content": { "version": 1, "type": "doc", "content": [] },
  "subtasks": [
    {
      "id": "uuid",
      "text": "タスク",
      "completed": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response:** 作成されたアイテム

#### GET /api/mcp/items/[id]
アイテムの詳細を取得します。

**Response:** アイテムオブジェクト

#### PATCH /api/mcp/items/[id]
アイテムを更新します。

**Request Body:**
```json
{
  "body": "更新された内容",
  "bucket": "rfa",
  "pinned": true,
  "due_date": "2024-12-31",
  "memo": "メモ",
  "summary": "タイトル",
  "adf_content": { "version": 1, "type": "doc", "content": [] },
  "subtasks": [...]
}
```

**Response:** 更新されたアイテム

#### DELETE /api/mcp/items/[id]
アイテムをアーカイブします。

**Response:**
```json
{
  "success": true
}
```

---

### ピン留め

#### POST /api/mcp/items/[id]/pin
アイテムをピン留めします。

**Response:**
```json
{
  "id": "uuid",
  "pinned": true
}
```

#### POST /api/mcp/items/[id]/unpin
アイテムのピン留めを解除します。

**Response:**
```json
{
  "id": "uuid",
  "pinned": false
}
```

---

### アーカイブ

#### POST /api/mcp/items/[id]/unarchive
アーカイブされたアイテムを復元します。

**Response:**
```json
{
  "id": "uuid",
  "status": "active"
}
```

---

### サブタスク管理

#### POST /api/mcp/items/[id]/subtasks
サブタスクを追加します。

**Request Body:**
```json
{
  "text": "タスクの内容"
}
```

**Response:**
```json
{
  "item": {...},
  "subtask": {
    "id": "uuid",
    "text": "タスクの内容",
    "completed": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PATCH /api/mcp/items/[id]/subtasks
サブタスクの完了/未完了を切り替えます。

**Request Body:**
```json
{
  "subtask_id": "uuid"
}
```

**Response:** 更新されたアイテム

#### PATCH /api/mcp/items/[id]/subtasks/[subtask_id]
サブタスクを更新します。

**Request Body:**
```json
{
  "text": "更新されたテキスト",
  "completed": true
}
```

**Response:** 更新されたアイテム

#### DELETE /api/mcp/items/[id]/subtasks/[subtask_id]
サブタスクを削除します。

**Response:** 更新されたアイテム

---

### 一括操作

#### POST /api/mcp/items/bulk-archive
複数のアイテムを一括アーカイブします。

**Request Body:**
```json
{
  "item_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "archived_count": 3,
  "item_ids": ["uuid1", "uuid2", "uuid3"]
}
```

#### POST /api/mcp/items/bulk-pin
複数のアイテムを一括でピン留め/解除します。

**Request Body:**
```json
{
  "item_ids": ["uuid1", "uuid2"],
  "pinned": true
}
```

**Response:**
```json
{
  "success": true,
  "updated_count": 2,
  "item_ids": ["uuid1", "uuid2"],
  "pinned": true
}
```

#### POST /api/mcp/items/bulk-update
複数のアイテムを一括更新します。

**Request Body:**
```json
{
  "item_ids": ["uuid1", "uuid2"],
  "updates": {
    "bucket": "management",
    "category": "重要",
    "due_date": "2024-12-31"
  }
}
```

**Response:**
```json
{
  "success": true,
  "updated_count": 2,
  "item_ids": ["uuid1", "uuid2"],
  "updates": {
    "bucket": "management",
    "category": "重要",
    "due_date": "2024-12-31"
  }
}
```

---

### カテゴリ管理

#### GET /api/mcp/categories
カテゴリ一覧を取得します。

**Query Parameters:**
- `bucket` (string, optional): プロジェクトでフィルタリング

**Response:**
```json
{
  "categories": [
    { "name": "重要", "count": 10 },
    { "name": "会議", "count": 5 }
  ]
}
```

#### POST /api/mcp/items/[id]/category
アイテムのカテゴリを設定します。

**Request Body:**
```json
{
  "category": "重要"
}
```

**Response:**
```json
{
  "id": "uuid",
  "category": "重要"
}
```

---

### プロジェクト管理

#### GET /api/mcp/buckets
プロジェクト（バケット）一覧を取得します。

**Response:**
```json
{
  "buckets": [
    { "id": "management", "label": "Management", "count": 10 },
    { "id": "rfa", "label": "Rfa", "count": 5 }
  ]
}
```

---

### 検索

#### GET /api/mcp/search
アイテムを検索します。

**Query Parameters:**
- `q` (string, required): 検索クエリ
- `limit` (number, optional): 取得件数 (デフォルト: 20)

**Response:**
```json
{
  "items": [...],
  "query": "検索クエリ"
}
```

---

## エラーレスポンス

すべてのエンドポイントは以下の形式でエラーを返します：

```json
{
  "error": "エラーメッセージ"
}
```

**HTTPステータスコード:**
- `400`: バリデーションエラー
- `401`: 認証エラー
- `404`: リソースが見つからない
- `500`: サーバーエラー

