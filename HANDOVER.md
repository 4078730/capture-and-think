# Capture & Think - 引き継ぎドキュメント

**作成日**: 2026-01-02
**目的**: プロジェクトの現状、問題点、解決策を新規参加者に伝えるための包括的なドキュメント

---

## 1. プロジェクト概要

### 1.1 Capture & Think とは

「思いついた瞬間を逃さない」をコンセプトにした、超シンプルなメモ・思考整理システム。

**コアバリュー**:
- **Capture**: テキストを投げ込むだけで保存
- **Inbox**: フラットなリスト表示、★(ピン)とアーカイブのみ
- **Ask**: 自然言語でAIに質問し、関連メモを検索・要約
- **AI Triage**: バックグラウンドでAIが自動分類・タグ付け・要約

### 1.2 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フロントエンド** | Next.js 15 (App Router), TypeScript, Tailwind CSS 4.0 |
| **バックエンド** | Next.js API Routes, Supabase (PostgreSQL) |
| **認証** | Supabase Auth (Google OAuth) |
| **AI** | Anthropic Claude API (Haiku for triage, Sonnet for Ask) |
| **状態管理** | TanStack React Query |
| **ホスティング** | Vercel |

### 1.3 ディレクトリ構造

```
capture-and-think/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # メインページ (現在問題あり)
│   │   ├── inbox/page.tsx      # Inboxページ (正常動作)
│   │   ├── ask/page.tsx        # AI質問ページ
│   │   ├── review/page.tsx     # AI承認ワークフロー
│   │   ├── settings/page.tsx   # 設定ページ
│   │   ├── auth/               # 認証関連
│   │   └── api/                # APIエンドポイント
│   ├── components/             # Reactコンポーネント
│   ├── hooks/                  # カスタムフック
│   │   └── use-items.ts        # アイテムCRUD (React Query)
│   ├── lib/                    # ユーティリティ
│   └── types/                  # TypeScript型定義
├── supabase/
│   ├── schema.sql              # データベーススキーマ
│   └── migrations/             # マイグレーションファイル
└── docs/                       # 仕様書
```

---

## 2. データベース設計

### 2.1 メインテーブル: `items`

```sql
-- ユーザー入力フィールド (3つのみ)
body: TEXT              -- メモ本文
bucket: TEXT            -- カテゴリ (work, video, life, boardgame)
pinned: BOOLEAN         -- ★フラグ

-- ステータス
id: UUID                -- 主キー
user_id: UUID           -- ユーザーID (RLSで制御)
status: TEXT            -- 'active' or 'archived'
triage_state: TEXT      -- 'pending', 'awaiting_approval', 'done', 'failed'

-- AI生成フィールド
category: TEXT          -- サブカテゴリ
kind: TEXT              -- 'idea', 'task', 'note', 'reference'
summary: TEXT           -- 15文字要約
auto_tags: TEXT[]       -- 自動抽出タグ
confidence: REAL        -- 確信度 (0.0-1.0)

-- 拡張機能
memo: TEXT              -- 詳細メモ
subtasks: JSONB         -- チェックリスト
due_date: DATE          -- 期限
adf_content: JSONB      -- リッチテキスト (ADF形式)
source: TEXT            -- 'pwa', 'claude', 'chatgpt', 'mcp'
```

### 2.2 RLS (Row Level Security)

全テーブルでユーザー分離を強制。自分のデータのみアクセス可能。

---

## 3. 現在の問題点

### 3.1 メイン問題: `/app/page.tsx` が動作しない

**症状**:
- ノートリストが表示されない
- ローディングが永遠に続く
- デバッグ要素すら表示されない

**根本原因**:
1. **ファイルが巨大化** (3711行) - 1ファイルにすべてを詰め込んだ
2. **既存アーキテクチャを無視** - `useItems` hookを使わず独自のデータ取得
3. **React Queryとの競合** - Providersで設定されたReact Queryと独自fetch/SWRが競合

### 3.2 対照的に動作するページ

**`/app/inbox/page.tsx`** (313行) は正常動作:
- `useItems` hook (React Query) を使用
- 既存コンポーネント (`ItemCard`, `ItemModal` など) を活用
- シンプルで保守性の高い構造

### 3.3 問題の発生経緯

1. 元々シンプルなCaptureページだった
2. 「3カラムOutlook風レイアウト」への変更を試みた
3. 変更の過程で既存hookを無視し、独自のデータ取得を実装
4. SSR/ハイドレーション問題が発生
5. SWRを導入して修正を試みたが根本解決に至らず

---

## 4. 試した解決策と結果

| 試行 | 内容 | 結果 |
|-----|------|------|
| 1 | React Query の `useItems` hook | SSR時に `isLoading: true` のまま変化しない |
| 2 | 独自 `useEffect` + `fetch` | 同上、状態が更新されない |
| 3 | SWR導入 | 同上、根本解決せず |
| 4 | デバッグUI追加 | デバッグ要素すら表示されない |
| 5 | `.next` ディレクトリ削除・再起動 | 一時的に改善するが再発 |

**結論**: page.tsx の構造自体が問題。部分修正では解決不可能。

---

## 5. 推奨される解決策

### 5.1 オプションA: page.tsx を完全に書き直す (推奨)

**手順**:
1. 現在の page.tsx をバックアップ (済: `page.tsx.backup`)
2. inbox/page.tsx のパターンを参考に新規作成
3. `useItems` hook を使用
4. 既存コンポーネントを活用
5. シンプルな3カラムレイアウトを実装

**参考コード構造**:
```tsx
"use client";

import { useState } from "react";
import { useItems, usePinItem, useArchiveItem } from "@/hooks/use-items";
import { ItemCard } from "@/components/item-card";
// ... 既存コンポーネントをインポート

export default function HomePage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data, isLoading, error } = useItems({
    status: showArchived ? "archived" : "active",
  });

  // シンプルなレンダリング
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 ...">...</aside>

      {/* Notes List */}
      <div className="w-80 ...">
        {data?.items.map(item => (
          <ItemCard key={item.id} item={item} ... />
        ))}
      </div>

      {/* Detail Panel */}
      <div className="flex-1 ...">...</div>
    </div>
  );
}
```

### 5.2 オプションB: /inbox をメインページにする

**手順**:
1. page.tsx を削除
2. inbox/page.tsx を page.tsx にコピー
3. ルーティング調整

**メリット**: 即座に動作するアプリが手に入る
**デメリット**: 3カラムレイアウトは実現されない

### 5.3 オプションC: アーキテクチャ刷新 (長期)

ユーザーが言及した「React + Rust」など、根本的な技術変更。
現在の問題を解決してから検討すべき。

---

## 6. 重要ファイル解説

### 6.1 `/src/hooks/use-items.ts`

**役割**: アイテムのCRUD操作を提供するReact Queryフック

```typescript
// 主要なフック
useItems(options)      // アイテム一覧取得
useCreateItem()        // 新規作成
useUpdateItem()        // 更新
usePinItem()           // ピン切り替え
useArchiveItem()       // アーカイブ
useDeleteItem()        // 削除
useCategories(bucket)  // カテゴリ一覧
```

**使用例** (inbox/page.tsx より):
```typescript
const { data, isLoading, error } = useItems({
  status: "active",
  bucket: bucket ?? undefined,
  q: debouncedSearch || undefined,
});
```

### 6.2 `/src/components/providers.tsx`

**役割**: React Query の QueryClient を提供

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 6.3 `/src/app/api/items/route.ts`

**役割**: アイテムのREST API

- `GET /api/items` - 一覧取得 (フィルタ: status, bucket, category, pinned, q)
- `POST /api/items` - 新規作成

**注意**: `triage_state` フィルタは削除済み (新規アイテムが表示されない問題の修正)

---

## 7. 環境構築

### 7.1 必要な環境変数 (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Anthropic (AI)
ANTHROPIC_API_KEY=xxx

# アプリURL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Calendar (オプション)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

### 7.2 開発サーバー起動

```bash
npm install
npm run dev
```

### 7.3 デプロイ

```bash
git push origin master  # Vercel自動デプロイ
# または
npx vercel --prod
```

---

## 8. 本番環境情報

- **URL**: https://capture-and-think.vercel.app
- **最新コミット**: `a868271` (Fix notes list display with SWR)
- **ステータス**: ノートリストが表示されない問題あり

---

## 9. 次のステップ

### 即座に行うべきこと

1. **page.tsx.backup を確認** - バックアップは作成済み
2. **新しい page.tsx を作成** - inbox/page.tsx のパターンで
3. **ローカルテスト** - `npm run dev` で動作確認
4. **デプロイ** - 動作確認後 `git push`

### 参考にすべきファイル

- `/src/app/inbox/page.tsx` - 動作する実装パターン
- `/src/hooks/use-items.ts` - 正しいデータ取得方法
- `/src/components/item-card.tsx` - アイテム表示コンポーネント

### 注意事項

- **独自のfetch/SWRを使わない** - 必ず `useItems` hook を使用
- **コンポーネントを活用** - 既存のItemCard, ItemModalなどを使う
- **シンプルに保つ** - 1ファイル300行以下を目標に

---

## 10. 技術的詳細

### 10.1 なぜ独自fetchが動かないのか

**仮説**:
1. Next.js 15 の SSR/ハイドレーション動作と競合
2. Turbopack の開発サーバーとの相性問題
3. React Query Provider の外でデータ取得を試みている

**検証方法**:
```typescript
// page.tsx で useItems を使い、console.log で状態を確認
const { data, isLoading } = useItems({ status: "active" });
console.log("useItems result:", { data, isLoading });
```

### 10.2 3カラムレイアウトの正しい実装

```tsx
<div className="flex h-screen">
  {/* Sidebar - 固定幅 */}
  <aside className="w-64 border-r flex-shrink-0">
    ...
  </aside>

  {/* Notes List - 固定幅、スクロール可能 */}
  <div className="w-80 border-r flex-shrink-0 overflow-y-auto">
    ...
  </div>

  {/* Detail - 残り幅を使用 */}
  <main className="flex-1 overflow-y-auto">
    ...
  </main>
</div>
```

---

## 11. 連絡先・リソース

- **リポジトリ**: https://github.com/4078730/capture-and-think
- **本番サイト**: https://capture-and-think.vercel.app
- **Supabase ダッシュボード**: (プロジェクト設定で確認)

---

## 付録A: ファイルサイズ比較

| ファイル | 行数 | 状態 |
|---------|-----|------|
| page.tsx | 3711 | 問題あり |
| inbox/page.tsx | 313 | 正常動作 |
| ask/page.tsx | ~200 | 正常動作 |
| review/page.tsx | ~300 | 正常動作 |

**教訓**: 1ファイル300行以下を維持すること

---

## 付録B: コミット履歴 (最近)

```
a868271 - Fix notes list display with SWR
ce1d3b5 - (前回のコミット)
```

---

*このドキュメントは2026-01-02時点の状態を反映しています。*
