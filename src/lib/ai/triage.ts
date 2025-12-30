import Anthropic from "@anthropic-ai/sdk";
import type { TriageResult, Item } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRIAGE_PROMPT = `あなたはメモを分類・整理するアシスタントです。

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

## 出力形式（JSONのみ、他の文章は不要）
{
  "bucket": "video",
  "category": "動画ネタ",
  "kind": "idea",
  "summary": "悟空かめはめ波の実写化企画",
  "auto_tags": ["悟空", "かめはめ波", "ドラゴンボール"],
  "confidence": 0.92
}`;

// Enhanced triage prompt with context and better task writing
const ENHANCED_TRIAGE_PROMPT = `あなたはメモ・タスク管理のエキスパートアシスタントです。
ユーザーの入力を分析し、整理されたタスク/メモに変換してください。

## ユーザーのコンテキスト
{context}

## 入力メモ
{body}

## bucket指定
{bucket}

## タスク
入力を分析し、以下を行ってください：

1. **分類**: 適切なbucket, category, kindを判定
2. **タイトル整理**: 入力が長文や曖昧な場合、わかりやすいタイトルを作成
3. **内容整理**: 内容を構造化（必要ならポイントをまとめる）
4. **URL整理**: 入力内のURLを抽出してリスト化

### bucket分類ルール
- work: 仕事関連（RFA、ロボット、技術など）
- video: 動画制作関連（ネタ、演出、編集など）
- life: 生活全般（観たい、買いたい、映画、本など）
- boardgame: ボードゲーム関連

### kind分類ルール
- task: 具体的なアクションが必要なもの（〜する、〜を確認）
- idea: アイデア、企画、やりたいこと（〜したい、〜はどうか）
- note: 情報、メモ、学んだこと（〜について、〜とは）
- reference: 参照用（観たい映画、読みたい本、参考URL）

## 出力形式（JSONのみ）
{
  "bucket": "video",
  "category": "動画ネタ",
  "kind": "idea",
  "summary": "15文字程度の要約",
  "auto_tags": ["タグ1", "タグ2"],
  "confidence": 0.9,
  "enhanced_title": "わかりやすいタイトル（30文字以内）",
  "enhanced_body": "整理された内容（元の情報を保持しつつ読みやすく）",
  "extracted_references": ["https://example.com"]
}

注意:
- enhanced_titleは入力がすでに明確なら元のままでOK
- enhanced_bodyは入力が短い場合は元のままでOK
- extracted_referencesはURLがない場合は空配列`;

export async function triageItem(
  body: string,
  bucket: string | null
): Promise<TriageResult> {
  const prompt = TRIAGE_PROMPT.replace("{body}", body).replace(
    "{bucket}",
    bucket ?? "未指定"
  );

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse triage response");
  }

  const result = JSON.parse(jsonMatch[0]) as TriageResult;

  // If bucket was already specified, preserve it
  if (bucket) {
    result.bucket = bucket as TriageResult["bucket"];
  }

  return result;
}

// Enhanced triage with context awareness
export async function triageItemWithContext(
  body: string,
  bucket: string | null,
  recentItems: Pick<Item, "body" | "bucket" | "category" | "kind">[]
): Promise<TriageResult> {
  // Build context from recent items
  let context = "最近のタスク/メモ:\n";
  if (recentItems.length > 0) {
    context += recentItems
      .slice(0, 10)
      .map((item) => `- [${item.bucket || "未分類"}/${item.category || "未分類"}] ${item.body.slice(0, 50)}`)
      .join("\n");
  } else {
    context = "（既存のタスクなし - 初回利用）";
  }

  const prompt = ENHANCED_TRIAGE_PROMPT
    .replace("{body}", body)
    .replace("{bucket}", bucket ?? "未指定")
    .replace("{context}", context);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse enhanced triage response");
  }

  const result = JSON.parse(jsonMatch[0]) as TriageResult;

  // If bucket was already specified, preserve it
  if (bucket) {
    result.bucket = bucket as TriageResult["bucket"];
  }

  return result;
}
