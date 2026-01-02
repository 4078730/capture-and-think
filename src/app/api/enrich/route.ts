import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        data: string;
      };
    };

interface EnrichRequest {
  text?: string;
  url?: string;
  image?: string; // base64 encoded image
  imageType?: string; // mime type like "image/png"
}

interface EnrichResponse {
  title: string;
  summary: string;
  body: string;
  suggestedBucket?: string;
  tags: string[];
  references: string[];
}

// Fetch URL content
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CaptureBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    // Extract text content from HTML
    if (contentType.includes("text/html")) {
      // Simple HTML to text extraction
      const textContent = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return textContent.slice(0, 10000); // Limit content length
    }

    return text.slice(0, 10000);
  } catch (error) {
    console.error("URL fetch error:", error);
    throw new Error("URLの取得に失敗しました");
  }
}

// Detect URLs in text
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  return text.match(urlRegex) || [];
}

// Parse base64 image data and extract media type
function parseBase64Image(image: string, declaredType?: string): { data: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" } | null {
  // Check if it's a data URL
  const dataUrlMatch = image.match(/^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mediaType: dataUrlMatch[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: dataUrlMatch[3],
    };
  }

  // If it's raw base64, try to detect from magic bytes
  let cleanBase64 = image;
  // Remove any whitespace
  cleanBase64 = cleanBase64.replace(/\s/g, "");

  // Detect image type from base64 magic bytes
  let detectedType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";

  // JPEG starts with /9j/
  if (cleanBase64.startsWith("/9j/")) {
    detectedType = "image/jpeg";
  }
  // PNG starts with iVBORw0KGgo
  else if (cleanBase64.startsWith("iVBORw0KGgo")) {
    detectedType = "image/png";
  }
  // GIF starts with R0lGOD
  else if (cleanBase64.startsWith("R0lGOD")) {
    detectedType = "image/gif";
  }
  // WebP starts with UklGR
  else if (cleanBase64.startsWith("UklGR")) {
    detectedType = "image/webp";
  }
  // Fall back to declared type if valid
  else if (declaredType && ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(declaredType)) {
    detectedType = declaredType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  }

  return {
    mediaType: detectedType,
    data: cleanBase64,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, url, image, imageType }: EnrichRequest = await request.json();

    if (!text && !url && !image) {
      return NextResponse.json(
        { error: "text, url, or image is required" },
        { status: 400 }
      );
    }

    // Build messages for Claude
    const contentParts: ContentBlock[] = [];

    // Add context about what we want
    let contextText = `あなたはメモ・タスク管理アシスタントです。ユーザーが提供した情報から、整理されたタスクやメモを作成してください。

## 出力形式（JSON）
{
  "title": "タスク・メモのタイトル（30文字以内）",
  "summary": "1行の要約（50文字以内）",
  "body": "詳細な内容。元の情報を整理して、必要な情報を含めてください。",
  "suggestedBucket": "management / rfa / cxc / paper / video / life / game のいずれか（最も適切なもの）",
  "tags": ["関連するタグ", "固有名詞", "キーワード"],
  "references": ["参照URL1", "参照URL2"]
}

## 入力情報
`;

    // Process URL if provided
    let urlContent = "";
    if (url) {
      try {
        urlContent = await fetchUrlContent(url);
        contextText += `\n### URL: ${url}\n\n${urlContent.slice(0, 5000)}\n`;
      } catch {
        contextText += `\n### URL: ${url}\n(内容を取得できませんでした)\n`;
      }
    }

    // Extract URLs from text
    if (text) {
      const extractedUrls = extractUrls(text);
      contextText += `\n### ユーザー入力テキスト:\n${text}\n`;

      // Fetch content from extracted URLs
      for (const extractedUrl of extractedUrls.slice(0, 3)) {
        if (extractedUrl !== url) {
          try {
            const content = await fetchUrlContent(extractedUrl);
            contextText += `\n### 参照URL: ${extractedUrl}\n${content.slice(0, 2000)}\n`;
          } catch {
            // Ignore fetch errors for extracted URLs
          }
        }
      }
    }

    // Add text content
    contentParts.push({
      type: "text",
      text: contextText,
    });

    // Add image if provided
    if (image) {
      const parsedImage = parseBase64Image(image, imageType);
      if (parsedImage) {
        contentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: parsedImage.mediaType,
            data: parsedImage.data,
          },
        });
        contentParts.push({
          type: "text",
          text: "\n上記の画像の内容も分析して、タスク・メモに含めてください。",
        });
      }
    }

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
    });

    // Parse response
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const result: EnrichResponse = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/enrich error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
