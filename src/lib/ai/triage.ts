import Anthropic from "@anthropic-ai/sdk";
import type { TriageResult } from "@/types";

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

export async function triageItem(
  body: string,
  bucket: string | null
): Promise<TriageResult> {
  const prompt = TRIAGE_PROMPT.replace("{body}", body).replace(
    "{bucket}",
    bucket ?? "未指定"
  );

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
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
