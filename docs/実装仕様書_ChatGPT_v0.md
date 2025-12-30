Capture & Think 企画・設計書 v1.0（実装依頼用）
1. 目的・背景
1.1 背景（現状課題）

仕事（RFA PM/Tech Lead）と生活（毎日ショート動画制作、ボドゲ制作）で、タスク／メモ／思考整理が分断されている。

Notion/Todoist/Keep等は「プロパティ入力」「ページ構造」「どこに書くか迷う」「整理コスト」により継続できなかった。

重要なのは「思いついた瞬間にメモする」導線。ここで迷うと入力が途切れ、結果的に忘れる／蓄積がゴミ化する。

1.2 目的（このプロジェクトで解くこと）

入力の摩擦を極小化し、思いつき・思考を確実に捕捉する

AIが裏で自動分類し、ユーザーは「必要なときだけ」参照・活用できる

「カテゴリ不明が溜まる」「一時メモが残り続ける」問題を、**運用ルール（熟成→月1棚卸し）**で抑える

1.3 成功指標（KPI / ゴール）

Capture所要時間：3秒以内（ホーム画面→入力→送信）

入力頻度：1日5–10件を無理なく継続

“どこに入れるか迷う”が発生しない（入力先は常に1つ）

1週間運用で「思いついたのに記録しなかった」が明確に減る

検索/Askで「必要な情報が回収できる」体験が得られる

2. コンセプト / デザイン原則
2.1 コア思想（確定）

入力：テキスト投げるだけ（bucket任意）

整理：AIが裏で自動分類

参照：リスト眺める + AIに聞く

ゴミ化防止：熟成 → 月1アーカイブ候補提示 → 手動で確定

2.2 避けるべき失敗（アンチゴール）

多数のプロパティ入力、複雑なビュー切替、ページ構造構築

“整理するための整理”が必要なUX

AIが勝手に期限/優先度/状態遷移を決める（信用毀損）

3. 想定ユーザー / 利用シーン
3.1 ユーザー属性

Androidユーザー

仕事用PC・生活用PCが物理的に別

仕事はOutlook中心、私用はGoogle Calendar（ただし本システムではカレンダー連携はオプション）

情報の見返し頻度は「必要なときだけ」

3.2 主要ユースケース（最重要）

思いついた瞬間に入力

例：動画ネタ、ボドゲのルール案、仕事の着想、観たい映画

後で見返す（リスト）

bucketでざっくり絞り、最近の入力を眺める

後で聞く（Ask）

「動画ネタ何かあった？」「UR5e関連まとめて」「ボドゲ案まとめて」

ゴミ化防止（棚卸し）

「30日以上前 & ★なし」候補を月1で提示→手動アーカイブ

4. スコープ
4.1 MVP範囲（v1.0で必須）

PWA（スマホホーム追加前提）

3画面：/capture /inbox /ask

データモデル：本文＋bucket（任意）＋★（任意）＋archived

AI triage（自動分類・要約・タグ）

Ask（検索＋要約回答）

月1のアーカイブ候補提示（候補抽出まで自動、確定は手動）

4.2 v1.0で“やらない”こと（明確化）

タスク工程管理（締切、優先度、プロジェクト階層、ガント等）

カレンダー同期（Outlook/Google）

自動削除（ユーザーは手動アーカイブ希望）

X（Twitter）連携など外部取り込み

ネイティブAndroidウィジェット（Phase2以降）

5. 情報設計（データモデル）
5.1 ユーザーが触る情報（UX 3項目）

body：本文（必須）

bucket：大分類（任意）

候補：work / video / life / boardgame

pinned：★（任意、重要/残す）

5.2 AIが付与するメタ情報（通常は隠す）

ai_category：短い日本語カテゴリ（例：動画ネタ、技術メモ、観たい、買いたい…）

ai_kind：task / idea / note / reference / unknown

ai_tags：固有名詞中心タグ（UR5e、iREX、悟空…）

ai_summary：1行要約

ai_confidence：0–1

triage_state：pending / done / failed

ai_processed_at：日時

source：入力元（pwa / widget / claude / chatgpt 等）

5.3 RDBスキーマ（論理）

items テーブル（単体で成立）

将来拡張（v2以降）：embeddings、sessions（Ask履歴）など

6. 画面・UX設計
6.1 ナビゲーション

下部タブ：Capture / Inbox / Ask

どの画面でもワンタップでCaptureへ戻れる

6.2 /capture（入力専用）

目的：最短で保存する
UI要件

起動時に入力欄へ自動フォーカス

bucketはボタン（任意・押さなくても送信可能）

送信後：トースト表示＋入力欄クリア

“閉じる”導線（片手運用想定）

受入基準

起動〜送信完了まで3秒以内（平均）

bucket未選択でも保存成功する

6.3 /inbox（リスト）

目的：眺める・絞る・★・アーカイブ
UI要件

bucketフィルタ（All/work/video/life/boardgame）

★フィルタ

categoryフィルタ（AI分類済みから選択）

検索（本文の全文/部分一致）

スワイプorボタンでアーカイブ

★はワンタップでトグル

受入基準

50件程度の表示でスクロールが快適

★トグルとアーカイブが即時反映

6.4 /ask（質問）

目的：必要な時に回収する
挙動

質問→回答（箇条書き）→根拠itemsカード（クリックで原文へ）

bucket絞り込み（任意）

受入基準

代表質問で「使える回答」が返る（後述のテストケース参照）

回答に根拠itemsが最低1件は提示される（該当がある場合）

7. AI設計
7.1 Triage（自動分類）

入力：body + bucket（あれば）
出力：bucket（未指定時のみ推定）、ai_category、ai_kind、ai_tags、ai_summary、confidence

制約（重要）

bucket指定済みは上書きしない

期限/優先度/状態遷移は生成しない

ai_categoryは短い日本語（ラベル化できる粒度）

7.2 Ask（検索＋要約）

v1方針（実装容易優先）

DB検索（本文）で候補抽出（最近順＋関連度）

候補をLLMへ渡し、要約回答生成

sources（参照したitem id）を返す

v2以降

embedding検索（意味検索）導入

bucket別の検索優先や、pinned優先など改善

8. API設計（最小）
8.1 必須エンドポイント

POST /api/items：追加

GET /api/items：一覧（フィルタ/検索/ページング）

PATCH /api/items/{id}：pin/bucket/status更新

POST /api/triage/run：pending一括処理（内部ジョブ）

POST /api/triage/{id}：単体再分類

POST /api/ask：質問

8.2 権限・認証

個人利用前提でも 認証は必須（URL漏洩対策）

Supabase Auth（Googleログイン）を基本

RLSを有効化し、user_id（所有者）で分離（将来の拡張を見据える）

※v1の最速実装ではRLS簡略でも可。ただし実運用では推奨

9. 非機能要件
9.1 パフォーマンス

Capture画面：操作レスポンス即時（保存APIは1秒以内）

Inbox：50件表示で快適

Ask：許容3〜8秒（LLM呼び出し）

9.2 可用性・運用

triageが失敗しても保存は成功する（triageは非同期）

triage_state=failed を再実行できる

バックアップ：Supabaseの標準バックアップ＋エクスポート機能（v1.1でも可）

9.3 セキュリティ

Auth必須

保存データは個人メモ（機微情報の可能性）→通信はHTTPS

LLMへ渡すのは必要最小限（Askは候補itemsのみ）

10. 受入テスト（具体例）
10.1 Capture

bucket未選択で入力→保存される

bucket=videoで入力→bucketが保持される

連続で5回入力してもストレスなく保存できる

10.2 Triage

入力：

「悟空のかめはめ波実写化、エフェクト案」→ ai_category=動画ネタ、ai_kind=idea、tagsに悟空

「UR5e デモ前のキャリブレーション手順」→ work寄りカテゴリ、tagsにUR5e

「インターステラー観たい」→ ai_kind=reference、ai_category=観たい

10.3 Ask

「動画ネタ何かあったっけ？」→ video系の候補を列挙

「UR5e関連まとめて」→ UR5e含むitemsを要約

「ボドゲのルール案」→ boardgame系の候補を要約

10.4 アーカイブ候補

30日以上前&★なしが候補として抽出される

手動アーカイブでstatus=archivedになる

11. 技術スタック（推奨）

Front：Next.js（PWA対応）

DB/Auth：Supabase（Postgres）

Hosting：Vercel

AI：OpenAI or Claude（どちらでもよいが、実装統一のため片方に寄せる）

Triage実行：cron（Supabase scheduled / GitHub Actions / Vercel cron など）

12. 実装フェーズ計画（コーディングAgent向け）
Phase 1（MVP：使える状態）

DB（items + RLS）

/capture /inbox

API（POST/GET/PATCH）

PWA設定（ホーム追加）

Phase 2（AI triage）

triage worker（pending→done/failed）

inboxでai_category表示・フィルタ

Phase 3（Ask）

検索→LLM要約→sources返却

UI（チャット風）実装

Phase 4（棚卸し補助）

「アーカイブ候補抽出」画面 or Inboxフィルタ追加

月1通知（通知はオプション、まずは画面で確認できればOK）

13. 仕様の決定事項（確定）

ルート：フルスクラッチ（PWA + Supabase）

bucket：work / video / life / boardgame

入力はテキスト中心、bucketは任意

整理はAIが自動、ただし状態遷移等はしない

ゴミ化防止は月1棚卸し（自動提示＋手動確定）

コーディングAgentに渡す“実装依頼テンプレ”

必要なら、このまま貼れる形で置きます。

目的：Capture & Think v1.0 をPWA + Supabaseで実装

画面：/capture /inbox /ask（下部タブ）

DB：items（本文＋bucket＋★＋archived＋AIメタ）

API：POST/GET/PATCH + triage(run/id) + ask

AI：triageは非同期。bucket指定は上書き不可。期限/優先度/状態遷移は生成禁止

受入テスト：上記のユースケースを満たすこと