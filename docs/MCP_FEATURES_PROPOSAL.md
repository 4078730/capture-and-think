# MCP機能拡張提案

## 現在実装済みのMCP機能

### 基本CRUD操作
- ✅ `GET /api/mcp/items` - アイテム一覧取得
- ✅ `POST /api/mcp/items` - アイテム作成
- ✅ `GET /api/mcp/items/[id]` - アイテム詳細取得
- ✅ `PATCH /api/mcp/items/[id]` - アイテム更新
- ✅ `DELETE /api/mcp/items/[id]` - アイテムアーカイブ

### サブタスク管理
- ✅ `POST /api/mcp/items/[id]/subtasks` - サブタスク追加
- ✅ `PATCH /api/mcp/items/[id]/subtasks` - サブタスクの完了/未完了切り替え

### 検索
- ✅ `GET /api/mcp/search` - テキスト検索

---

## 追加すべきMCP機能（優先度順）

### 🔴 高優先度：コア機能の補完

#### 1. **ピン留め機能**
```
POST /api/mcp/items/[id]/pin
POST /api/mcp/items/[id]/unpin
```
**理由**: 重要なメモをマークする基本機能。AIが重要度を判断してピン留めできるように。

#### 2. **アーカイブ解除**
```
POST /api/mcp/items/[id]/unarchive
```
**理由**: アーカイブしたメモを復元できるように。誤ってアーカイブした場合の復旧に必要。

#### 3. **リッチテキストコンテンツ（ADF形式）のサポート**
```
PATCH /api/mcp/items/[id]
  - adf_content フィールドの追加
```
**理由**: 現在のMCPではプレーンテキストのみ。リッチテキスト（太字、リスト、画像など）を扱えるように。

#### 4. **サブタスクの削除・更新**
```
DELETE /api/mcp/items/[id]/subtasks/[subtask_id]
PATCH /api/mcp/items/[id]/subtasks/[subtask_id]
  - text の更新
```
**理由**: サブタスクの完全な管理に必要。追加・切り替えだけでなく、編集・削除もできるように。

---

### 🟡 中優先度：ワークフロー改善

#### 5. **一括操作**
```
POST /api/mcp/items/bulk-archive
POST /api/mcp/items/bulk-pin
POST /api/mcp/items/bulk-update
```
**理由**: 複数のメモを一度に操作できるように。AIが複数のメモを整理する際に便利。

#### 6. **カテゴリ管理**
```
GET /api/mcp/categories
POST /api/mcp/items/[id]/category
```
**理由**: カテゴリベースでの整理・検索に必要。

#### 7. **プロジェクト（バケット）一覧取得**
```
GET /api/mcp/buckets
```
**理由**: 利用可能なプロジェクトを確認してからメモを作成できるように。

#### 8. **フィルタリング強化**
```
GET /api/mcp/items
  - pinned フィルター追加
  - category フィルター追加
  - due_date フィルター追加
  - sort オプション追加（newest, oldest, due_date, pinned_first）
```
**理由**: より柔軟な検索・フィルタリングが可能に。

---

### 🟢 低優先度：高度な機能

#### 9. **AI Triage結果の取得・承認**
```
GET /api/mcp/items/[id]/triage
POST /api/mcp/items/[id]/approve
POST /api/mcp/items/[id]/reject
```
**理由**: AIが提案した分類結果を確認・承認できるように。

#### 10. **統計情報**
```
GET /api/mcp/stats
  - プロジェクト別のメモ数
  - タスクの完了率
  - 最近のアクティビティ
```
**理由**: データの概要を把握して、適切な操作を提案できるように。

#### 11. **カレンダー連携**
```
GET /api/mcp/items/upcoming
POST /api/mcp/items/[id]/calendar
```
**理由**: 期限のあるメモを管理しやすく。

#### 12. **メモ間のリンク**
```
POST /api/mcp/items/[id]/link
GET /api/mcp/items/[id]/related
```
**理由**: 関連するメモを関連付けられるように。

---

## 実装の推奨順序

### Phase 1: 基本機能の補完（即座に実装すべき）
1. ピン留め機能
2. アーカイブ解除
3. リッチテキスト（ADF）サポート
4. サブタスクの削除・更新

### Phase 2: ワークフロー改善（次に実装）
5. 一括操作
6. カテゴリ管理
7. プロジェクト一覧
8. フィルタリング強化

### Phase 3: 高度な機能（将来的に）
9. AI Triage操作
10. 統計情報
11. カレンダー連携
12. メモ間リンク

---

## MCPツールとしての使い方例

### 例1: 会議メモの作成とタスク抽出
```
1. POST /api/mcp/items - 会議メモを作成
2. POST /api/mcp/items/[id]/subtasks - 会議で出たタスクを追加
3. POST /api/mcp/items/[id]/pin - 重要なのでピン留め
```

### 例2: プロジェクトの整理
```
1. GET /api/mcp/buckets - プロジェクト一覧を取得
2. GET /api/mcp/items?bucket=management - 特定プロジェクトのメモを取得
3. POST /api/mcp/items/bulk-archive - 古いメモを一括アーカイブ
```

### 例3: タスク管理
```
1. GET /api/mcp/items?pinned=true - ピン留めされたメモを取得
2. GET /api/mcp/items/[id] - メモの詳細とサブタスクを確認
3. PATCH /api/mcp/items/[id]/subtasks - タスクの完了状態を更新
```

---

## 注意事項

1. **認証**: すべてのエンドポイントで `authenticateMCPRequest` を使用
2. **エラーハンドリング**: 適切なエラーレスポンスとログ記録
3. **レート制限**: 大量リクエストを防ぐための制限検討
4. **バリデーション**: 入力データの検証（Zodスキーマ使用）
5. **ドキュメント**: API仕様書の更新

