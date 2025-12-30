import Anthropic from "@anthropic-ai/sdk";
import type { Item, AskResponse } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ASK_PROMPT = `あなたはユーザーのメモを検索・要約するアシスタントです。

## ユーザーの質問
{query}

## 関連するメモ（検索結果）
{items}

## タスク
1. 質問に対する回答を簡潔に作成してください
2. 関連するメモがあれば、その内容を要約して含めてください
3. 箇条書きで分かりやすく整理してください

## 出力形式
まず簡潔な回答を述べ、その後に関連メモを列挙してください。`;

export async function askQuestion(
  query: string,
  items: Item[]
): Promise<AskResponse> {
  const itemsText = items
    .map((item, i) => `${i + 1}. [ID: ${item.id}] ${item.body}`)
    .join("\n");

  const prompt = ASK_PROMPT.replace("{query}", query).replace(
    "{items}",
    itemsText || "関連するメモが見つかりませんでした。"
  );

  const response = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const answer =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Create sources from items that appear in the answer
  const sources = items.slice(0, 5).map((item, i) => ({
    id: item.id,
    body: item.body,
    summary: item.summary,
    relevance: 1 - i * 0.1, // Decay based on order
  }));

  return { answer, sources };
}
