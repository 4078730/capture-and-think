"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, User, Bot } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { useAsk } from "@/hooks/use-ask";
import { cn, truncateText } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    id: string;
    body: string;
    summary: string | null;
  }>;
}

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ask = useAsk();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || ask.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    try {
      const result = await ask.mutateAsync({ query: query.trim() });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "申し訳ありません。エラーが発生しました。もう一度お試しください。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-center h-14 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold">Ask</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)] py-12">
            <Bot className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium mb-2">何でも聞いてください</p>
            <p className="text-sm">保存したメモから関連情報を検索して回答します</p>
            <div className="mt-6 space-y-2 text-sm">
              <p className="opacity-75">例：</p>
              <p>「動画ネタ何かあったっけ？」</p>
              <p>「UR5e関連のメモまとめて」</p>
              <p>「ボドゲのルール案」</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === "user"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--secondary)] text-[var(--foreground)]"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <p className="text-xs font-medium mb-2 opacity-70">
                      関連メモ:
                    </p>
                    <div className="space-y-2">
                      {message.sources.slice(0, 3).map((source) => (
                        <div
                          key={source.id}
                          className="text-xs p-2 rounded bg-[var(--background)] opacity-80"
                        >
                          {truncateText(source.summary || source.body, 50)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[var(--foreground)]" />
                </div>
              )}
            </div>
          ))
        )}

        {ask.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-[var(--secondary)] rounded-lg p-3">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-[var(--background)] border-t border-[var(--border)]">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="何でも聞く..."
            className="flex-1 px-4 py-2 bg-[var(--secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            disabled={ask.isPending}
          />
          <button
            type="submit"
            disabled={!query.trim() || ask.isPending}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <Navigation />
    </div>
  );
}
