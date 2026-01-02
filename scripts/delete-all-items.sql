-- すべてのメモを削除するSQLクエリ
-- SupabaseのSQLエディタで実行してください

-- 注意: このクエリは現在ログインしているユーザーのメモをすべて削除します
-- 実行前に必ずバックアップを取るか、確認してください

-- すべてのメモを削除（現在のユーザーのみ）
DELETE FROM items
WHERE user_id = auth.uid();

-- 削除された件数を確認
-- SELECT COUNT(*) FROM items WHERE user_id = auth.uid();

