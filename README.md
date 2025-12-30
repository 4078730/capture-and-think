# Capture & Think

思いついた瞬間を逃さない、超シンプルなメモ・思考整理システム。

## 概要

- **Capture**: テキストを投げるだけで保存
- **Inbox**: フラットなリストで眺める。pin（★）とarchiveだけ
- **Ask**: AIに自然言語で質問して、関連メモを検索・要約
- **AI Triage**: バックグラウンドでAIが自動分類・タグ付け・要約

## 技術スタック

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (claude-3-5-sonnet)
- **Hosting**: Vercel

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseのセットアップ

詳細は [supabase/SETUP.md](./supabase/SETUP.md) を参照してください。

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. `supabase/schema.sql` をSQL Editorで実行
3. Google認証を設定

### 3. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

必要な値を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセス。

## ディレクトリ構成

```
capture-and-think/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # /capture
│   │   ├── inbox/        # /inbox
│   │   ├── ask/          # /ask
│   │   ├── auth/         # 認証関連
│   │   └── api/          # API Routes
│   ├── components/       # UIコンポーネント
│   ├── hooks/            # カスタムフック
│   ├── lib/              # ユーティリティ
│   │   ├── supabase/     # Supabaseクライアント
│   │   ├── ai/           # AI処理
│   │   └── parser.ts     # ゆるい記法パーサー
│   └── types/            # 型定義
├── public/               # 静的ファイル
├── supabase/             # DBスキーマ・セットアップガイド
└── docs/                 # 仕様書
```

## 機能

### ゆるい記法

入力時に以下のハッシュタグを使用できます:

- `#work` / `#video` / `#life` / `#boardgame` - bucketを指定
- `#keep` - ★（pin）を付ける

例: `悟空のかめはめ波実写化 #video #keep`

### bucket

4つのbucketでメモを大分類:

- **work**: 仕事関連
- **video**: 動画制作関連
- **life**: 生活関連
- **boardgame**: ボードゲーム関連

### AI機能

- **自動分類**: 保存後にAIがcategory、kind、summary、tagsを自動付与
- **Ask**: 自然言語で質問すると関連メモを検索・要約して回答

## デプロイ

Vercelにデプロイ:

1. GitHubにpush
2. VercelでGitHubリポジトリを連携
3. 環境変数を設定
4. デプロイ

## ライセンス

MIT
