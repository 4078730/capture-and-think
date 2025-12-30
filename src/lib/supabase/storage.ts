import { createClient } from "./client";

const BUCKET_NAME = "item-attachments";

/**
 * 画像をSupabase Storageにアップロード
 * @param file アップロードするファイル
 * @param userId ユーザーID（フォルダ分け用）
 * @param itemId アイテムID（オプション）
 * @returns アップロードされた画像のパブリックURL
 */
export async function uploadImage(
  file: File,
  userId: string,
  itemId?: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient();

  // ファイル名を生成: {userId}/{itemId?}/{timestamp}-{random}.{ext}
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const fileName = `${timestamp}-${random}.${ext}`;
  const path = itemId
    ? `${userId}/${itemId}/${fileName}`
    : `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // パブリックURLを取得
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return { url: publicUrl, path };
}

/**
 * Blobから画像をアップロード（ペースト用）
 */
export async function uploadImageFromBlob(
  blob: Blob,
  userId: string,
  itemId?: string
): Promise<{ url: string; path: string }> {
  const ext = blob.type.split("/")[1] || "png";
  const file = new File([blob], `pasted-image.${ext}`, { type: blob.type });
  return uploadImage(file, userId, itemId);
}

/**
 * 画像を削除
 */
export async function deleteImage(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * アイテムに関連する画像をすべて削除
 */
export async function deleteItemImages(
  userId: string,
  itemId: string
): Promise<void> {
  const supabase = createClient();
  const folderPath = `${userId}/${itemId}`;

  // フォルダ内のファイル一覧を取得
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError) {
    throw new Error(`Failed to list images: ${listError.message}`);
  }

  if (files && files.length > 0) {
    const paths = files.map((file) => `${folderPath}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (deleteError) {
      throw new Error(`Failed to delete images: ${deleteError.message}`);
    }
  }
}

/**
 * 画像URLからストレージパスを抽出
 */
export function extractPathFromUrl(url: string): string | null {
  const match = url.match(
    /\/storage\/v1\/object\/public\/item-attachments\/(.+)$/
  );
  return match ? match[1] : null;
}
