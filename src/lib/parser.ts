import type { Bucket, ParsedInput } from "@/types";

const BUCKET_PATTERN = /#(management|rfa|cxc|paper|video|life|game)\b/gi;
const KEEP_PATTERN = /#keep\b/gi;

export function parseInput(raw: string): ParsedInput {
  let body = raw.trim();
  let bucket: Bucket | undefined;
  let pinned = false;

  // bucket抽出
  const bucketMatch = body.match(BUCKET_PATTERN);
  if (bucketMatch) {
    bucket = bucketMatch[0].slice(1).toLowerCase() as Bucket;
    body = body.replace(BUCKET_PATTERN, "");
  }

  // pinned抽出
  if (KEEP_PATTERN.test(body)) {
    pinned = true;
    body = body.replace(KEEP_PATTERN, "");
  }

  // 余分なスペースを整理
  body = body.replace(/\s+/g, " ").trim();

  return { body, bucket, pinned };
}
