"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Item, ItemsResponse, Bucket, CreateItemInput, Subtask } from "@/types";
import type { ADFDocument } from "@/lib/adf";

interface UseItemsOptions {
  status?: "active" | "archived";
  bucket?: Bucket | null;
  category?: string | null;
  pinned?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export function useItems(options: UseItemsOptions = {}) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.bucket) params.set("bucket", options.bucket);
  if (options.category) params.set("category", options.category);
  if (options.pinned) params.set("pinned", "true");
  if (options.q) params.set("q", options.q);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.offset) params.set("offset", options.offset.toString());

  return useQuery<ItemsResponse>({
    queryKey: ["items", options],
    queryFn: async () => {
      const res = await fetch(`/api/items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json() as Promise<Item>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

interface UpdateItemData {
  id: string;
  body?: string;
  bucket?: Bucket | null;
  pinned?: boolean;
  memo?: string;
  due_date?: string | null;
  subtasks?: Subtask[];
  summary?: string | null;
  adf_content?: ADFDocument | null;
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateItemData) => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json() as Promise<Item>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function usePinItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const endpoint = pinned ? "pin" : "unpin";
      const res = await fetch(`/api/items/${id}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to update pin");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useArchiveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}/archive`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to archive item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUnarchiveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}/unarchive`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to unarchive item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}/delete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

interface Category {
  name: string;
  count: number;
}

export function useCategories(bucket?: Bucket | null) {
  const params = new URLSearchParams();
  if (bucket) params.set("bucket", bucket);

  return useQuery<{ categories: Category[] }>({
    queryKey: ["categories", bucket],
    queryFn: async () => {
      const res = await fetch(`/api/categories?${params}`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
}

export function useArchiveCandidates() {
  return useQuery<{ items: Item[]; total: number }>({
    queryKey: ["archive-candidates"],
    queryFn: async () => {
      const res = await fetch("/api/archive-candidates");
      if (!res.ok) throw new Error("Failed to fetch archive candidates");
      return res.json();
    },
  });
}

export function useBulkArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/items/${id}/archive`, { method: "POST" })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to archive ${failed.length} items`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["archive-candidates"] });
    },
  });
}
