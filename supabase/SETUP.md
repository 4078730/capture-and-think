# Supabase セットアップガイド

## 1. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」でプロジェクトを作成
3. プロジェクト名を入力（例: `capture-and-think`）
4. データベースパスワードを設定（安全な場所に保存）
5. リージョンを選択（Tokyo を推奨）

## 2. 環境変数の取得

プロジェクト作成後、Settings > API から以下を取得:

- **Project URL**: `https://xxxx.supabase.co`
- **anon (public) key**: `eyJhbGciOiJ...`（公開OK）
- **service_role key**: `eyJhbGciOiJ...`（秘密）

`.env.local` ファイルを作成:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. データベーススキーマの作成

1. Supabase Dashboard > SQL Editor を開く
2. `schema.sql` の内容をコピー＆ペースト
3. 「Run」をクリック

## 4. Google 認証の設定

### 4.1 Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIs & Services」>「Credentials」を開く
4. 「Create Credentials」>「OAuth client ID」を選択
5. Application type: 「Web application」
6. 名前を入力（例: Capture & Think）
7. Authorized JavaScript origins:
   - `http://localhost:3000` (開発用)
   - `https://your-app.vercel.app` (本番用)
8. Authorized redirect URIs:
   - `https://xxxx.supabase.co/auth/v1/callback`
9. Client ID と Client Secret を保存

### 4.2 Supabase での設定

1. Supabase Dashboard > Authentication > Providers
2. 「Google」を有効化
3. Client ID と Client Secret を入力
4. 「Save」をクリック

## 5. 確認

以下のコマンドで開発サーバーを起動:

```bash
npm run dev
```

`http://localhost:3000` にアクセスし、Googleログインが動作することを確認。

## トラブルシューティング

### 「RLS policy violation」エラー

- RLSが有効になっているか確認
- ポリシーが正しく設定されているか確認
- `auth.uid()` が正しく取得できているか確認

### 「Invalid API key」エラー

- 環境変数が正しく設定されているか確認
- `.env.local` ファイルが存在するか確認
- 開発サーバーを再起動

### Google ログインのリダイレクトエラー

- Authorized redirect URIs に Supabase の callback URL が含まれているか確認
- URL の末尾に `/` がないか確認
