"use client";

import { useState } from "react";
import { Key, Plus, Copy, Trash2, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only present when newly created
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface KeysResponse {
  keys: ApiKey[];
}

export function ApiKeyManager() {
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<KeysResponse>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("APIキーを作成しました");
    },
    onError: () => {
      toast.error("作成に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/keys?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("APIキーを削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("コピーしました");
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    createMutation.mutate(newKeyName.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-[var(--muted-foreground)]" />
        <h2 className="text-lg font-semibold">APIキー</h2>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        ClaudeやChatGPTからこのアプリにアクセスするためのAPIキーを管理します。
      </p>

      {/* Newly created key display */}
      {newlyCreatedKey && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            新しいAPIキーが作成されました。このキーは一度しか表示されません。
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-[var(--background)] rounded text-sm font-mono overflow-x-auto">
              {showKey ? newlyCreatedKey : "•".repeat(40)}
            </code>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="p-2 hover:bg-[var(--secondary)] rounded"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(newlyCreatedKey)}
              className="p-2 hover:bg-[var(--secondary)] rounded"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewlyCreatedKey(null)}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="キー名 (例: Claude Desktop)"
          className="flex-1 px-3 py-2 bg-[var(--secondary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newKeyName.trim() || createMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          作成
        </button>
      </div>

      {/* Key list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-[var(--muted-foreground)]">読み込み中...</div>
        ) : data?.keys.length === 0 ? (
          <div className="text-sm text-[var(--muted-foreground)]">
            APIキーがありません
          </div>
        ) : (
          data?.keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg"
            >
              <div>
                <div className="font-medium text-sm">{key.name}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  作成: {new Date(key.created_at).toLocaleDateString("ja-JP")}
                  {key.last_used_at && (
                    <> / 最終使用: {new Date(key.last_used_at).toLocaleDateString("ja-JP")}</>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(key.id)}
                disabled={deleteMutation.isPending}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* MCP Configuration Guide */}
      <div className="p-4 bg-[var(--secondary)] rounded-lg space-y-3">
        <h3 className="font-medium text-sm">Claude Desktop設定</h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          Claude Desktopでこのアプリを使うには、以下の設定を追加してください:
        </p>
        <pre className="p-3 bg-[var(--background)] rounded text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "capture-and-think": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-remote-server",
        "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/mcp"
      ],
      "env": {
        "API_KEY": "ct_your-api-key-here"
      }
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}
