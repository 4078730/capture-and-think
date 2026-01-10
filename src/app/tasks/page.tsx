"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, CheckSquare, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ResponsiveLayout } from "@/components/responsive-layout";
import { cn, getBucketColor } from "@/lib/utils";
import type { TasksByBucket, ExtractedTask } from "@/lib/tasks";

interface TasksResponse {
  groups: TasksByBucket[];
  total: number;
  completed: number;
}

export default function TasksPage() {
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set(["management", "rfa", "cxc", "paper", "video", "life", "game", "uncategorized"]));
  const [showCompleted, setShowCompleted] = useState(true);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<TasksResponse>({
    queryKey: ["tasks", showCompleted],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?includeCompleted=${showCompleted}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ itemId, lineIndex }: { itemId: string; lineIndex: number }) => {
      const res = await fetch("/api/tasks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, lineIndex }),
      });
      if (!res.ok) throw new Error("Failed to toggle task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: () => {
      toast.error("タスクの更新に失敗しました");
    },
  });

  const toggleBucket = (bucket: string) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  };

  const handleToggleTask = (task: ExtractedTask) => {
    toggleTask.mutate({ itemId: task.itemId, lineIndex: task.lineIndex });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-violet-500/30">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f12] to-[#0a0a0b]" />
      </div>

      <ResponsiveLayout headerTitle="Tasks">
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Tasks</h1>
                {data && (
                  <p className="text-xs text-white/40">
                    {data.completed} / {data.total} completed
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                showCompleted
                  ? "bg-white/[0.08] text-white"
                  : "bg-white/[0.02] text-white/50 hover:text-white/70"
              )}
            >
              {showCompleted ? "Hide completed" : "Show completed"}
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white/[0.02] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !data || data.groups.length === 0 ? (
            <div className="text-center py-16">
              <CheckSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No tasks found</p>
              <p className="text-white/30 text-sm mt-1">
                Create tasks in your notes using <code className="bg-white/[0.08] px-1.5 py-0.5 rounded">- [ ]</code>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.groups.map((group) => {
                const bucketKey = group.bucket || "uncategorized";
                const isExpanded = expandedBuckets.has(bucketKey);
                const incompleteTasks = group.tasks.filter((t) => !t.completed);
                const completedTasks = group.tasks.filter((t) => t.completed);

                return (
                  <div
                    key={bucketKey}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleBucket(bucketKey)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/40" />
                      )}
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getBucketColor(group.bucket) }}
                      />
                      <span className="font-medium text-white/90">{group.bucketLabel}</span>
                      <span className="text-xs text-white/40 ml-auto">
                        {group.completedCount} / {group.totalCount}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/[0.06] px-4 py-2">
                        {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
                          <p className="text-white/30 text-sm py-2">No tasks</p>
                        ) : (
                          <>
                            <div className="space-y-1">
                              {incompleteTasks.map((task) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  onToggle={() => handleToggleTask(task)}
                                />
                              ))}
                            </div>

                            {showCompleted && completedTasks.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                <p className="text-[10px] text-white/20 uppercase mb-2">Completed</p>
                                <div className="space-y-1">
                                  {completedTasks.map((task) => (
                                    <TaskRow
                                      key={task.id}
                                      task={task}
                                      onToggle={() => handleToggleTask(task)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ResponsiveLayout>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: ExtractedTask; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
          task.completed
            ? "bg-violet-500/20 border-violet-500/30"
            : "border-white/20 hover:border-violet-400"
        )}
      >
        {task.completed && <Check className="w-2.5 h-2.5 text-violet-400" strokeWidth={3} />}
      </button>

      <Link
        href={`/?item=${task.itemId}`}
        className={cn(
          "flex-1 text-sm hover:text-violet-400 transition-colors cursor-pointer",
          task.completed ? "text-white/30 line-through" : "text-white/80"
        )}
      >
        {task.text}
      </Link>

      <Link
        href={`/?item=${task.itemId}`}
        className="text-[10px] text-white/30 max-w-[120px] truncate hover:text-violet-400 transition-colors"
      >
        {task.itemTitle}
      </Link>
    </div>
  );
}
