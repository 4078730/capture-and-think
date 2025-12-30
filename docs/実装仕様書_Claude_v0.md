# Capture & Think - 企画・設計書 v1.0

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [背景と課題](#2-背景と課題)
3. [ターゲットユーザー](#3-ターゲットユーザー)
4. [設計原則](#4-設計原則)
5. [機能要件](#5-機能要件)
6. [非機能要件](#6-非機能要件)
7. [データモデル](#7-データモデル)
8. [API仕様](#8-api仕様)
9. [画面設計](#9-画面設計)
10. [AI処理仕様](#10-ai処理仕様)
11. [技術スタック](#11-技術スタック)
12. [MCP Server仕様](#12-mcp-server仕様)
13. [実装ロードマップ](#13-実装ロードマップ)
14. [将来拡張](#14-将来拡張)

---

## 1. プロジェクト概要

### 1.1 プロダクト名

**Capture & Think**

### 1.2 コンセプト

「思いついた瞬間を逃さない」ための超シンプルなメモ・思考整理システム。

入力はテキストを投げるだけ。整理はAIが自動で行い、参照は「リストを眺める」か「AIに聞く」の2通り。従来のタスク管理・メモアプリで挫折したユーザーのために、徹底的にUXを削ぎ落とした設計。

### 1.3 一言で表すと

> 「入力ゼロメタデータ」＋「AI自動整理」＋「後で必要な時に探せる」

### 1.4 主要機能

| 機能 | 説明 |
|-----|------|
| **Capture** | テキストを投げるだけで保存。メタデータ入力は任意。 |
| **Inbox** | フラットなリストで眺める。pin（★）とarchiveだけ。 |
| **Ask** | AIに自然言語で質問して、関連メモを検索・要約。 |
| **AI Triage** | バックグラウンドでAIが自動分類・タグ付け・要約。 |

---

## 2. 背景と課題

### 2.1 ユーザーの現状

- **仕事**: RFAプロジェクトのPM兼テクニカルリード（パナソニックコネクト）
- **生活**: AIを使ったキャラクター実写化ショート動画を毎日1本制作
- **ツール環境**:
  - 仕事PC / 生活PC / Androidスマホ（物理的に別）
  - 仕事: GitHub, Confluence, Teams, Outlook, SharePoint (O365)
  - 予定: Outlook（仕事）、Google Calendar（生活）、Calendar Budgeで連携

### 2.2 過去の挫折パターン

| ツール | 挫折理由 |
|-------|---------|
| **Notion** | プロパティ入力が面倒、ページ構造を作るのが大変 |
| **Todoist** | UXが合わない、レイヤー分けが煩雑 |
| **Google Keep** | 整理が大変、溜まる一方 |
| **Google Memo** | 使いにくい |

### 2.3 根本課題

```
「どこに入れるか迷う」→ 結局入れない → アイデアを逃す
「整理のための整理」→ 面倒になる → 離脱
「カテゴリ不明が溜まる / 一時メモが残る」→ ゴミ化
```

### 2.4 特に困っていること

- 動画ネタを思いついた時、どこに入れたらいいか迷って結局入れなくなる
- 仕事と生活のメモが分断している
- 思考整理（頭の中をまとめておく）ができていない

---

## 3. ターゲットユーザー

### 3.1 ペルソナ

| 項目 | 内容 |
|-----|------|
| **名前** | Akira（仮名） |
| **職業** | パナソニックコネクト ロボティクス研究部 |
| **役割** | RFAプロジェクト PM兼テクニカルリード |
| **副業/趣味** | AIキャラクター実写化ショート動画（毎日1本） |
| **デバイス** | 仕事PC (Windows)、生活PC、Android スマホ |
| **メモ頻度** | 1日5〜10回 |
| **技術力** | 高い（自分でコードを書いてカスタマイズ可能） |

### 3.2 ユーザーの行動パターン

- 移動中や作業中にアイデアを思いつく
- すぐにメモしたいが「どこに入れるか」で迷う
- まとまった時間に整理するのは苦手（というか時間がない）
- 必要な時に過去のメモを探したい
- AIとの会話の中でメモを参照したい

---

## 4. 設計原則

### 4.1 コア原則（4つ）

| 原則 | 説明 | 実装方針 |
|-----|------|---------|
| **Capture is King** | 思いついた瞬間を逃さない | スマホから1タップ→入力→送信で完結 |
| **ゼロメタデータ入力** | 入力時の選択をなくす | bucket任意、他は全てAI自動 |
| **AIは整形担当** | 決定はしない、提案まで | 分類・タグ・要約のみ。状態遷移はしない |
| **ゴミ化防止** | 溜まりっぱなしを防ぐ | 手動アーカイブ + 月次候補提案 |

### 4.2 UX原則

- **入力は3秒以内に完了できる**
- **画面遷移は最小限**（3画面のみ）
- **プロパティ選択は強制しない**
- **整理のための整理をさせない**
- **見たい時にだけ見る**（週次レビュー等を強制しない）

### 4.3 やらないこと

| やらないこと | 理由 |
|------------|------|
| 期限管理（due date） | 管理コストが増える。必要なら本文に書く |
| 優先度設定（priority） | 同上 |
| プロジェクト階層 | 同上。bucketの4分類で十分 |
| 工程管理（ステージ遷移） | 動画制作の工程管理は不要と明言あり |
| タスクの完了ボタン | 不要ならarchiveで十分 |

---

## 5. 機能要件

### 5.1 機能一覧

| ID | 機能 | 優先度 | Phase |
|----|------|--------|-------|
| F-01 | テキスト入力で保存 | 必須 | 1 |
| F-02 | bucket選択（任意） | 必須 | 1 |
| F-03 | ゆるい記法パース（#video等） | 必須 | 1 |
| F-04 | アイテム一覧表示 | 必須 | 1 |
| F-05 | bucketフィルタ | 必須 | 1 |
| F-06 | pin（★）トグル | 必須 | 1 |
| F-07 | archive | 必須 | 1 |
| F-08 | 全文検索 | 必須 | 1 |
| F-09 | AI自動分類（triage） | 必須 | 2 |
| F-10 | categoryフィルタ | 必須 | 2 |
| F-11 | AI検索・要約（/ask） | 必須 | 3 |
| F-12 | MCP Server連携 | 任意 | 3 |
| F-13 | アーカイブ候補提案（月次） | 任意 | 3 |
| F-14 | カレンダー連携 | 任意 | 将来 |

### 5.2 機能詳細

#### F-01: テキスト入力で保存

- 入力欄にテキストを入力して送信
- 送信後、入力欄をクリアしてフィードバック表示
- 開いた瞬間に入力欄にフォーカス

#### F-02: bucket選択（任意）

- 4つのbucket: `work` / `video` / `life` / `boardgame`
- ボタンで選択可能（押さなくてもOK）
- 未選択の場合はNULLで保存、AIが推定

#### F-03: ゆるい記法パース

入力テキスト内の特定パターンを解析してメタデータに反映。

| 記法 | 効果 | 例 |
|-----|------|-----|
| `#work` | bucket = work | `#work π0の学習確認` |
| `#video` | bucket = video | `#video 悟空かめはめ波` |
| `#life` | bucket = life | `#life インターステラー観たい` |
| `#boardgame` | bucket = boardgame | `#boardgame カタン拡張` |
| `#keep` | pinned = true | `重要なメモ #keep` |

- 記法は本文から除去して保存
- 大文字小文字は区別しない

#### F-04: アイテム一覧表示

- 新しい順（created_at DESC）で表示
- 表示項目:
  - ★（pin状態）
  - 本文（1-2行で省略）
  - bucket / category / 経過時間
- activeのみ表示（archivedは別画面 or フィルタ）

#### F-05: bucketフィルタ

- タブ or ボタンで切り替え: [全部] [work] [video] [life] [boardgame]
- 選択中のbucketをハイライト

#### F-06: pin（★）トグル

- ★アイコンをタップでtrue/false切り替え
- pinned=trueのアイテムは[★]フィルタで絞り込み可能

#### F-07: archive

- 左スワイプ or ボタンでアーカイブ
- アーカイブ直後のみUndo可能（5秒程度）
- status = 'archived' に更新

#### F-08: 全文検索

- 検索ボックスに入力でリアルタイム絞り込み
- body + summary を対象に全文検索

#### F-09: AI自動分類（triage）

- アイテム保存後、非同期でAI処理を実行
- 付与するメタデータ:
  - `bucket`（未指定時のみ推定）
  - `category`（日本語ラベル）
  - `kind`（idea/task/note/reference）
  - `summary`（1行要約）
  - `auto_tags`（固有名詞）
- 処理状態: pending → done / failed

#### F-10: categoryフィルタ

- AI分類後に有効になるドロップダウンフィルタ
- 動的にcategory一覧を取得して表示

#### F-11: AI検索・要約（/ask）

- 自然言語で質問を入力
- AIが関連アイテムを検索し、要約して回答
- 回答には元アイテムへのリンクを含む

#### F-12: MCP Server連携

- Claude/ChatGPTからアイテムの追加・検索・更新が可能
- 詳細は「12. MCP Server仕様」参照

#### F-13: アーカイブ候補提案（月次）

- 条件: 30日以上前 & pinned = false
- 月1回、候補一覧を表示
- ワンタップで一括アーカイブ可能

---

## 6. 非機能要件

### 6.1 パフォーマンス

| 項目 | 要件 |
|-----|------|
| 入力→保存完了 | 1秒以内 |
| 一覧表示 | 2秒以内（100件まで） |
| 全文検索 | 500ms以内 |
| AI triage | 10秒以内（非同期なのでUXには影響しない） |
| AI ask | 5秒以内 |

### 6.2 可用性

| 項目 | 要件 |
|-----|------|
| 稼働率 | 99%以上 |
| オフライン対応 | PWAでキャプチャのみ対応（後で同期） |

### 6.3 セキュリティ

| 項目 | 要件 |
|-----|------|
| 認証 | Googleログイン（シングルユーザー想定） |
| 通信 | HTTPS必須 |
| データ保存 | Supabase（暗号化対応） |

### 6.4 対応デバイス

| デバイス | 対応 |
|---------|------|
| Android スマホ | 必須（メイン） |
| PC ブラウザ (Chrome) | 必須 |
| iOS | 将来対応 |

---

## 7. データモデル

### 7.1 ER図（概念）

```
┌─────────────────────────────────────────────────────────────┐
│                          items                              │
├─────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                               │
│ body: TEXT (必須)                                           │
│ bucket: TEXT (任意) [work/video/life/boardgame]            │
│ pinned: BOOLEAN (default: false)                           │
│ status: TEXT (default: active) [active/archived]           │
│ ─────────────────────────────────────────────────────────  │
│ category: TEXT (AI)                                         │
│ kind: TEXT (AI) [idea/task/note/reference/unknown]         │
│ summary: TEXT (AI)                                          │
│ auto_tags: TEXT[] (AI)                                      │
│ confidence: REAL (AI)                                       │
│ ─────────────────────────────────────────────────────────  │
│ triage_state: TEXT [pending/done/failed]                   │
│ triaged_at: TIMESTAMPTZ                                     │
│ source: TEXT [pwa/widget/claude/chatgpt]                   │
│ ─────────────────────────────────────────────────────────  │
│ created_at: TIMESTAMPTZ                                     │
│ updated_at: TIMESTAMPTZ                                     │
│ fts: TSVECTOR (generated)                                   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 DDL（PostgreSQL / Supabase）

```sql
-- テーブル作成
CREATE TABLE items (
  -- 基本
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ユーザー入力（3つだけ）
  body TEXT NOT NULL,
  bucket TEXT CHECK (bucket IN ('work', 'video', 'life', 'boardgame')),
  pinned BOOLEAN DEFAULT FALSE,
  
  -- 状態
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- AI自動付与
  category TEXT,
  kind TEXT DEFAULT 'unknown' CHECK (kind IN ('idea', 'task', 'note', 'reference', 'unknown')),
  summary TEXT,
  auto_tags TEXT[] DEFAULT '{}',
  confidence REAL DEFAULT 0.0,
  
  -- 処理状態
  triage_state TEXT DEFAULT 'pending' CHECK (triage_state IN ('pending', 'done', 'failed')),
  triaged_at TIMESTAMPTZ,
  
  -- メタ
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_bucket ON items(bucket);
CREATE INDEX idx_items_pinned ON items(pinned);
CREATE INDEX idx_items_triage_state ON items(triage_state);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_created_at ON items(created_at DESC);

-- 全文検索（日本語対応はpg_bigmが必要、まずはsimpleで）
ALTER TABLE items ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', body || ' ' || COALESCE(summary, ''))
  ) STORED;
CREATE INDEX idx_items_fts ON items USING GIN(fts);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 7.3 フィールド詳細

#### ユーザーが触るフィールド（3つ）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `body` | TEXT | ◯ | メモ本文。1行でも長文でもOK |
| `bucket` | TEXT | × | 大分類。work/video/life/boardgame。未指定可 |
| `pinned` | BOOLEAN | × | ★マーク。重要/残したいもの |

#### システム管理フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `status` | TEXT | active（表示）/ archived（非表示） |
| `source` | TEXT | 入力元。pwa/widget/claude/chatgpt/browser |
| `created_at` | TIMESTAMPTZ | 作成日時 |
| `updated_at` | TIMESTAMPTZ | 更新日時（自動） |

#### AI自動付与フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `category` | TEXT | 日本語ラベル。「動画ネタ」「技術メモ」「観たい」など |
| `kind` | TEXT | 大分類。idea/task/note/reference/unknown |
| `summary` | TEXT | 1行要約（15文字程度） |
| `auto_tags` | TEXT[] | 固有名詞タグ。["UR5e", "悟空", "カタン"] |
| `confidence` | REAL | AI分類の自信度。0.0〜1.0 |
| `triage_state` | TEXT | pending（未処理）/done（完了）/failed（失敗） |
| `triaged_at` | TIMESTAMPTZ | AI処理完了日時 |

---

## 8. API仕様

### 8.1 エンドポイント一覧

| Method | Path | 説明 | Phase |
|--------|------|------|-------|
| POST | `/api/items` | アイテム作成 | 1 |
| GET | `/api/items` | アイテム一覧取得 | 1 |
| GET | `/api/items/:id` | アイテム詳細取得 | 1 |
| PATCH | `/api/items/:id` | アイテム更新 | 1 |
| POST | `/api/items/:id/pin` | pinをtrueに | 1 |
| POST | `/api/items/:id/unpin` | pinをfalseに | 1 |
| POST | `/api/items/:id/archive` | アーカイブ | 1 |
| POST | `/api/items/:id/unarchive` | アーカイブ解除 | 1 |
| POST | `/api/triage/run` | AI分類実行（内部用） | 2 |
| POST | `/api/ask` | AI検索・要約 | 3 |
| GET | `/api/archive-candidates` | アーカイブ候補取得 | 3 |
| POST | `/api/bulk-archive` | 一括アーカイブ | 3 |
| GET | `/api/categories` | カテゴリ一覧取得 | 2 |

### 8.2 エンドポイント詳細

#### POST /api/items

アイテムを新規作成する。

**Request Body:**
```json
{
  "body": "悟空のかめはめ波を実写化 #keep",
  "bucket": "video",
  "source": "pwa"
}
```

- `body`: 必須。ゆるい記法を含む生テキスト
- `bucket`: 任意。指定があれば優先、なければゆるい記法からパース
- `source`: 任意。入力元の識別

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "body": "悟空のかめはめ波を実写化",
  "bucket": "video",
  "pinned": true,
  "status": "active",
  "triage_state": "pending",
  "source": "pwa",
  "created_at": "2024-12-30T10:00:00Z",
  "updated_at": "2024-12-30T10:00:00Z"
}
```

**処理フロー:**
1. ゆるい記法をパース（#video, #keep等を抽出）
2. DBに保存（triage_state = pending）
3. 非同期でAI triageをキュー登録
4. レスポンス返却

---

#### GET /api/items

アイテム一覧を取得する。

**Query Parameters:**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `status` | string | active | active / archived |
| `bucket` | string | - | フィルタ |
| `category` | string | - | フィルタ |
| `pinned` | boolean | - | trueの時、pinnedのみ |
| `q` | string | - | 全文検索クエリ |
| `limit` | number | 50 | 取得件数 |
| `offset` | number | 0 | オフセット |

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "body": "悟空のかめはめ波を実写化",
      "bucket": "video",
      "pinned": true,
      "status": "active",
      "category": "動画ネタ",
      "kind": "idea",
      "summary": "悟空かめはめ波の実写化企画",
      "auto_tags": ["悟空", "かめはめ波", "ドラゴンボール"],
      "triage_state": "done",
      "created_at": "2024-12-30T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### PATCH /api/items/:id

アイテムを更新する。更新可能なフィールドは限定。

**Request Body:**
```json
{
  "body": "更新後の本文",
  "bucket": "work",
  "pinned": true
}
```

- 更新可能: `body`, `bucket`, `pinned`
- 更新不可: `status`（専用エンドポイントを使用）、AI付与フィールド

**Response (200 OK):**
```json
{
  "id": "...",
  "body": "更新後の本文",
  "bucket": "work",
  "pinned": true,
  "updated_at": "2024-12-30T11:00:00Z"
}
```

---

#### POST /api/items/:id/pin

pinned = true に設定する。

**Response (200 OK):**
```json
{
  "id": "...",
  "pinned": true
}
```

---

#### POST /api/items/:id/archive

status = archived に設定する。

**Response (200 OK):**
```json
{
  "id": "...",
  "status": "archived"
}
```

---

#### POST /api/triage/run

AI分類を実行する（内部用・Cron用）。

**Request Body:**
```json
{
  "item_ids": ["id1", "id2"]
}
```

- `item_ids`: 任意。指定がなければ pending 全件を処理

**Response (200 OK):**
```json
{
  "processed": 5,
  "succeeded": 4,
  "failed": 1
}
```

---

#### POST /api/ask

AIに自然言語で質問し、関連アイテムを検索・要約する。

**Request Body:**
```json
{
  "query": "動画ネタ何かあったっけ？",
  "bucket": "video"
}
```

- `query`: 必須。自然言語の質問
- `bucket`: 任意。検索対象を絞り込み

**Response (200 OK):**
```json
{
  "answer": "直近の動画ネタは以下の3件です：\n1. 悟空のかめはめ波実写化\n2. ナルト螺旋丸再現\n3. ルフィのギア5",
  "sources": [
    {
      "id": "...",
      "body": "悟空のかめはめ波を実写化",
      "summary": "悟空かめはめ波の実写化企画",
      "relevance": 0.95
    }
  ]
}
```

---

#### GET /api/archive-candidates

アーカイブ候補を取得する。

**条件:** created_at が30日以上前 かつ pinned = false かつ status = active

**Response (200 OK):**
```json
{
  "items": [...],
  "total": 8
}
```

---

#### POST /api/bulk-archive

複数アイテムを一括アーカイブする。

**Request Body:**
```json
{
  "item_ids": ["id1", "id2", "id3"]
}
```

**Response (200 OK):**
```json
{
  "archived": 3
}
```

---

#### GET /api/categories

現在使用されているカテゴリ一覧を取得する。

**Response (200 OK):**
```json
{
  "categories": [
    { "name": "動画ネタ", "count": 15 },
    { "name": "技術メモ", "count": 8 },
    { "name": "観たい", "count": 5 }
  ]
}
```

---

## 9. 画面設計

### 9.1 画面構成

```
┌─────────────────────────────────────────┐
│            Capture & Think              │
├─────────────────────────────────────────┤
│                                         │
│   /capture  - 入力画面（デフォルト）     │
│   /inbox    - 一覧画面                  │
│   /ask      - AI検索画面                │
│                                         │
├─────────────────────────────────────────┤
│  [📝 Capture]  [📥 Inbox]  [💬 Ask]     │
└─────────────────────────────────────────┘
```

### 9.2 /capture（入力画面）

```
┌─────────────────────────────────────────┐
│              Capture & Think            │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  何でも書く...                  │   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [work] [video] [life] [boardgame]     │
│   ↑ 任意。押さなくてもOK               │
│                                         │
│           [ 📤 送信 ]                   │
│                                         │
├─────────────────────────────────────────┤
│  [📝 Capture]  [📥 Inbox]  [💬 Ask]     │
└─────────────────────────────────────────┘
```

**仕様:**
- 画面を開いた瞬間、テキストエリアにフォーカス
- bucketボタンは任意（押さなくても送信可能）
- 送信後:
  - 入力欄クリア
  - トースト表示「保存しました ✓」
  - 画面遷移なし（連続入力可能）

### 9.3 /inbox（一覧画面）

```
┌─────────────────────────────────────────┐
│              Capture & Think            │
├─────────────────────────────────────────┤
│  [全部] [work] [video] [life] [board..]│
│  [category ▼]          [🔍 検索...]    │
├─────────────────────────────────────────┤
│                                         │
│  ★ 悟空のかめはめ波を実写化            │
│    video • 動画ネタ • 2時間前          │
│                              [archive] │
│  ───────────────────────────────────── │
│  ☆ π0の学習結果確認                    │
│    work • 技術メモ • 昨日              │
│                              [archive] │
│  ───────────────────────────────────── │
│  ☆ カタン新拡張買いたい                │
│    boardgame • 買いたい • 3日前        │
│                              [archive] │
│  ───────────────────────────────────── │
│  ☆ インターステラー観たい              │
│    life • 観たい • 1週間前             │
│                              [archive] │
│                                         │
├─────────────────────────────────────────┤
│  [📝 Capture]  [📥 Inbox]  [💬 Ask]     │
└─────────────────────────────────────────┘
```

**仕様:**
- デフォルト: status=active, 新しい順
- フィルタ:
  - bucketタブ
  - categoryドロップダウン（AI分類後に有効）
  - 検索ボックス（全文検索）
  - [★]ボタン（pinned=trueのみ表示）
- アイテム操作:
  - ★タップ: pin/unpinトグル
  - 左スワイプ: archive（Undo付き）
  - アイテムタップ: 詳細/編集モーダル

### 9.4 /ask（AI検索画面）

```
┌─────────────────────────────────────────┐
│              Capture & Think            │
├─────────────────────────────────────────┤
│                                         │
│  あなた:                                │
│  ┌─────────────────────────────────┐   │
│  │ 動画ネタ何かあったっけ？        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  AI:                                    │
│  ┌─────────────────────────────────┐   │
│  │ 直近の動画ネタは以下の3件です： │   │
│  │                                 │   │
│  │ • 悟空のかめはめ波実写化        │   │
│  │ • ナルト螺旋丸を実写で再現      │   │
│  │ • ルフィのギア5                 │   │
│  │                                 │   │
│  │ [すべて見る →]                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  あなた:                                │
│  ┌─────────────────────────────────┐   │
│  │ UR5e関連のメモまとめて          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  AI:                                    │
│  ┌─────────────────────────────────┐   │
│  │ UR5e関連のメモが3件あります：   │   │
│  │                                 │   │
│  │ 1. キャリブレーション手順       │   │
│  │ 2. iREXデモ用の設定値           │   │
│  │ 3. Distribution Shift対策      │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [何でも聞く...]              [送信]   │
├─────────────────────────────────────────┤
│  [📝 Capture]  [📥 Inbox]  [💬 Ask]     │
└─────────────────────────────────────────┘
```

**仕様:**
- チャット形式のUI
- 質問を送信するとAIが検索・要約して回答
- 回答には関連アイテムへのリンクを含む
- 会話履歴はセッション内のみ保持（永続化しない）

---

## 10. AI処理仕様

### 10.1 AI Triage（自動分類）

#### 処理タイミング

- アイテム保存後、非同期で実行
- triage_state = 'pending' のアイテムが対象
- 定期実行（Cron）でも処理可能

#### 入力

```json
{
  "body": "悟空のかめはめ波を実写化",
  "bucket": "video"
}
```

#### 出力

```json
{
  "bucket": "video",
  "category": "動画ネタ",
  "kind": "idea",
  "summary": "悟空かめはめ波の実写化企画",
  "auto_tags": ["悟空", "かめはめ波", "ドラゴンボール"],
  "confidence": 0.92
}
```

#### プロンプト

```markdown
あなたはメモを分類・整理するアシスタントです。

## 入力
ユーザーのメモ: {body}
bucket（指定あれば）: {bucket}

## タスク
以下の項目を推定してJSONで出力してください。

1. bucket: work / video / life / boardgame のいずれか
   - 指定がある場合はそれを使用
   - 指定がない場合は内容から推定
   
2. category: 日本語の短いラベル（例：動画ネタ、技術メモ、観たい、買いたい）
   - bucket別のカテゴリヒント:
     - video: 動画ネタ, 演出案, キャラ案, 編集メモ, 投稿文案
     - work: RFAメモ, 調整メモ, 実験メモ, 企画案, TODO候補, 技術メモ
     - boardgame: ゲームアイデア, ルール案, コンポーネント, テストメモ
     - life: 観たい, 買いたい, 行きたい, 学習メモ, 雑メモ
   
3. kind: idea / task / note / reference のいずれか
   - idea: アイデア、企画、やりたいこと
   - task: やるべきこと、TODO
   - note: 情報、メモ、学び
   - reference: 参照用（観たい、買いたい、リンク等）
   
4. summary: 内容の1行要約（15文字程度）

5. auto_tags: 固有名詞を抽出（人名、作品名、技術用語など）

6. confidence: 分類の自信度（0.0〜1.0）

## 出力形式（JSON）
{
  "bucket": "video",
  "category": "動画ネタ",
  "kind": "idea",
  "summary": "悟空かめはめ波の実写化企画",
  "auto_tags": ["悟空", "かめはめ波", "ドラゴンボール"],
  "confidence": 0.92
}
```

#### やらないこと

| 項目 | 理由 |
|-----|------|
| due（期限）の推定 | 管理コスト増加。必要なら本文に書く |
| priority（優先度）の付与 | 同上 |
| status（状態）の変更 | AIが勝手に変えると信用を失う |

### 10.2 AI Ask（検索・要約）

#### 処理フロー

1. ユーザーの質問を受け取る
2. 質問からキーワード・意図を抽出
3. DBから関連アイテムを検索（全文検索 + フィルタ）
4. 検索結果をコンテキストとしてLLMに渡す
5. LLMが要約・回答を生成
6. 回答 + 元アイテムリストを返却

#### プロンプト

```markdown
あなたはユーザーのメモを検索・要約するアシスタントです。

## ユーザーの質問
{query}

## 関連するメモ（検索結果）
{items}

## タスク
1. 質問に対する回答を簡潔に作成してください
2. 関連するメモがあれば、その内容を要約して含めてください
3. 箇条書きで分かりやすく整理してください

## 出力形式
まず簡潔な回答を述べ、その後に関連メモを列挙してください。
```

---

## 11. 技術スタック

### 11.1 全体構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        クライアント                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │ Android PWA  │    │ PC Browser   │    │ Claude/GPT   │  │
│   │ (メイン)     │    │              │    │ (MCP)        │  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│          │                   │                   │          │
└──────────┼───────────────────┼───────────────────┼──────────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
├─────────────────────────────────────────────────────────────┤
│   Next.js 14 (App Router)                                   │
│   ├── /app/page.tsx           (Capture)                     │
│   ├── /app/inbox/page.tsx     (Inbox)                       │
│   ├── /app/ask/page.tsx       (Ask)                         │
│   └── /app/api/...            (API Routes)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │ Claude API   │  │ MCP Server   │
│   (Postgres) │  │ (AI処理)     │  │ (任意)       │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 11.2 フロントエンド

| 項目 | 選定 | 理由 |
|-----|------|------|
| フレームワーク | Next.js 14 (App Router) | PWA対応、API Routes、Vercelとの親和性 |
| UI | Tailwind CSS + shadcn/ui | 高速開発、カスタマイズ性 |
| 状態管理 | React Query (TanStack Query) | サーバー状態管理に最適 |
| PWA | next-pwa | Service Worker、オフライン対応 |

### 11.3 バックエンド

| 項目 | 選定 | 理由 |
|-----|------|------|
| API | Next.js API Routes | フロントと同一リポジトリで管理 |
| DB | Supabase (PostgreSQL) | 認証、全文検索、リアルタイム対応 |
| 認証 | Supabase Auth (Google) | シンプル、セキュア |
| AI | Claude API (claude-3-5-sonnet) | 高精度、日本語対応 |

### 11.4 インフラ

| 項目 | 選定 | 理由 |
|-----|------|------|
| ホスティング | Vercel | Next.jsとの親和性、自動デプロイ |
| DB | Supabase (クラウド) | マネージド、無料枠あり |
| 非同期処理 | Vercel Cron or Supabase Edge Functions | AI triageのバックグラウンド実行 |

### 11.5 開発環境

| 項目 | 選定 |
|-----|------|
| 言語 | TypeScript |
| パッケージ管理 | pnpm |
| コード品質 | ESLint + Prettier |
| テスト | Vitest + Playwright |

### 11.6 依存パッケージ（主要）

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "@tanstack/react-query": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "next-pwa": "^5.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

---

## 12. MCP Server仕様

### 12.1 概要

Claude Desktop や ChatGPT から直接アイテムの追加・検索・更新を行うためのMCP (Model Context Protocol) Server。

### 12.2 Tools定義

```typescript
const tools = [
  {
    name: "capture",
    description: "メモを即座に保存する",
    inputSchema: {
      type: "object",
      properties: {
        body: {
          type: "string",
          description: "メモの本文"
        },
        bucket: {
          type: "string",
          enum: ["work", "video", "life", "boardgame"],
          description: "カテゴリ（任意）"
        }
      },
      required: ["body"]
    }
  },
  {
    name: "list_items",
    description: "メモ一覧を取得する",
    inputSchema: {
      type: "object",
      properties: {
        bucket: {
          type: "string",
          enum: ["work", "video", "life", "boardgame"],
          description: "フィルタするbucket（任意）"
        },
        pinned: {
          type: "boolean",
          description: "pinnedのみ取得（任意）"
        },
        limit: {
          type: "number",
          description: "取得件数（デフォルト: 20）"
        }
      }
    }
  },
  {
    name: "search",
    description: "キーワードでメモを検索する",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "検索キーワード"
        },
        bucket: {
          type: "string",
          enum: ["work", "video", "life", "boardgame"],
          description: "フィルタするbucket（任意）"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "ask",
    description: "自然言語でメモを検索・要約する",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "質問文"
        },
        bucket: {
          type: "string",
          enum: ["work", "video", "life", "boardgame"],
          description: "検索対象のbucket（任意）"
        }
      },
      required: ["question"]
    }
  },
  {
    name: "pin",
    description: "メモを★（重要）にする",
    inputSchema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          description: "対象のアイテムID"
        }
      },
      required: ["item_id"]
    }
  },
  {
    name: "archive",
    description: "メモをアーカイブする",
    inputSchema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          description: "対象のアイテムID"
        }
      },
      required: ["item_id"]
    }
  },
  {
    name: "get_archive_candidates",
    description: "アーカイブ候補（30日以上前、unpinned）を取得する",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "bulk_archive",
    description: "複数メモを一括アーカイブする",
    inputSchema: {
      type: "object",
      properties: {
        item_ids: {
          type: "array",
          items: { type: "string" },
          description: "アーカイブするアイテムIDの配列"
        }
      },
      required: ["item_ids"]
    }
  }
];
```

### 12.3 使用例

```
ユーザー: 「動画ネタ追加：ルフィのギア5実写化」
Claude: → capture({ body: "ルフィのギア5実写化", bucket: "video" })
        → 「追加しました ✓」

ユーザー: 「最近のボドゲメモ見せて」
Claude: → list_items({ bucket: "boardgame", limit: 5 })
        → 「直近のボドゲメモです：
           1. カタン新拡張買いたい
           2. テラフォーミングマーズ戦略メモ
           ...」

ユーザー: 「UR5e関連で何考えてたっけ？」
Claude: → ask({ question: "UR5e関連のメモ", bucket: "work" })
        → 「UR5e関連のメモが3件あります：
           1. キャリブレーション手順
           2. iREXデモ用設定値
           3. Distribution Shift対策」

ユーザー: 「アーカイブ候補ある？」
Claude: → get_archive_candidates()
        → 「30日以上前のメモが8件あります。一括アーカイブしますか？」
```

---

## 13. 実装ロードマップ

### 13.1 Phase 1: MVP（4-5日）

**目標:** 今日から使える最小構成

| Day | タスク |
|-----|-------|
| 1 | Supabaseプロジェクト作成、DBスキーマ作成、認証設定 |
| 2 | Next.jsプロジェクト作成、Supabase接続、PWA設定 |
| 3 | /capture画面実装（ゆるい記法対応） |
| 4 | /inbox画面実装（リスト、pin、archive、フィルタ） |
| 5 | Vercelデプロイ、Androidホーム画面追加、テスト |

**成果物:**
- 入力→保存が動作
- 一覧表示、pin、archiveが動作
- Androidから使用可能（PWA）

### 13.2 Phase 2: AI分類（3-4日）

**目標:** AIによる自動分類が動作

| Day | タスク |
|-----|-------|
| 6 | AI triageロジック実装（Claude API連携） |
| 7 | 非同期処理実装（保存後に自動実行） |
| 8 | categoryフィルタ実装、UI調整 |
| 9 | エラーハンドリング、リトライ処理 |

**成果物:**
- 保存後に自動でAI分類が実行される
- category、summary、tagsが付与される
- categoryでフィルタ可能

### 13.3 Phase 3: AI検索・要約（5-7日）

**目標:** AIに聞いて検索・要約ができる

| Day | タスク |
|-----|-------|
| 10-11 | /ask画面実装（チャットUI） |
| 12-13 | AI askロジック実装（検索+要約） |
| 14 | アーカイブ候補提案機能 |
| 15-16 | MCP Server実装（任意） |

**成果物:**
- 自然言語で質問→関連メモを検索・要約
- 月次アーカイブ候補の提案
- Claude/ChatGPTからの操作（MCP）

### 13.4 継続改善

| 項目 | 内容 |
|-----|------|
| 分類精度向上 | プロンプト調整、フィードバック学習 |
| 検索強化 | embedding検索（意味検索）の導入 |
| ネイティブウィジェット | Kotlinで薄いAndroidウィジェット |
| エクスポート | Markdown/JSON形式でエクスポート |
| カレンダー連携 | Google Calendar連携（任意） |

---

## 14. 将来拡張

### 14.1 短期（3ヶ月以内）

- **embedding検索**: 意味的に類似したメモを検索
- **ネイティブAndroidウィジェット**: 1タップ入力をさらに高速化
- **バックアップ・エクスポート**: データのポータビリティ確保

### 14.2 中期（半年以内）

- **カレンダー連携**: タスク→予定化の簡易連携
- **ブラウザ拡張**: WebページをワンクリックでCapture
- **音声入力**: Whisper APIで音声→テキスト変換

### 14.3 長期（1年以内）

- **チーム共有**: 複数人でのメモ共有（必要なら）
- **AI提案**: 関連メモの自動提案、リマインド
- **外部連携**: Slack、Discord、Notion等への連携

---

## 付録

### A. ゆるい記法パーサー実装

```typescript
interface ParsedInput {
  body: string;
  bucket?: 'work' | 'video' | 'life' | 'boardgame';
  pinned: boolean;
}

export function parseInput(raw: string): ParsedInput {
  let body = raw.trim();
  let bucket: ParsedInput['bucket'];
  let pinned = false;

  // bucket抽出
  const bucketMatch = body.match(/#(work|video|life|boardgame)\b/i);
  if (bucketMatch) {
    bucket = bucketMatch[1].toLowerCase() as ParsedInput['bucket'];
    body = body.replace(bucketMatch[0], '');
  }

  // pinned抽出
  if (/#keep\b/i.test(body)) {
    pinned = true;
    body = body.replace(/#keep\b/gi, '');
  }

  // 余分なスペースを整理
  body = body.replace(/\s+/g, ' ').trim();

  return { body, bucket, pinned };
}
```

### B. 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Claude API
ANTHROPIC_API_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://capture-and-think.vercel.app
```

### C. ディレクトリ構成

```
capture-and-think/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # /capture
│   ├── inbox/
│   │   └── page.tsx          # /inbox
│   ├── ask/
│   │   └── page.tsx          # /ask
│   └── api/
│       ├── items/
│       │   ├── route.ts      # GET, POST
│       │   └── [id]/
│       │       ├── route.ts  # GET, PATCH
│       │       ├── pin/route.ts
│       │       ├── unpin/route.ts
│       │       └── archive/route.ts
│       ├── triage/
│       │   └── run/route.ts
│       ├── ask/route.ts
│       ├── categories/route.ts
│       ├── archive-candidates/route.ts
│       └── bulk-archive/route.ts
├── components/
│   ├── ui/                   # shadcn/ui
│   ├── CaptureForm.tsx
│   ├── ItemList.tsx
│   ├── ItemCard.tsx
│   ├── AskChat.tsx
│   └── Navigation.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── ai/
│   │   ├── triage.ts
│   │   └── ask.ts
│   ├── parser.ts
│   └── utils.ts
├── hooks/
│   ├── useItems.ts
│   └── useAsk.ts
├── types/
│   └── index.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2024-12-30 | 初版作成 |

---

**ドキュメント作成者:** Claude (Anthropic)  
**レビュー:** Akira  
**最終更新:** 2024-12-30