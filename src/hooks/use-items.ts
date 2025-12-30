"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Item, ItemsResponse, Bucket, CreateItemInput } from "@/types";

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

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string; body?: string; bucket?: Bucket | null; pinned?: boolean }) => {
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
