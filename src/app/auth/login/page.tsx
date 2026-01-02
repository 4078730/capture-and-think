"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Show error from URL params (e.g., from OAuth callback)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setMessage(`エラー: ${error}`);
    }
  }, [searchParams]);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (isSignUp) {
        // Sign up with password
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setMessage(`エラー: ${error.message}`);
        } else {
          setMessage("確認メールを送信しました。メールを確認してください。");
        }
      } else {
        // Sign in with password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMessage(`エラー: ${error.message}`);
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Auth exception:", err);
      setMessage(`エラー: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
    setLoading(false);
  };

  const handleOtpLogin = async () => {
    if (!email) {
      setMessage("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("OTP login error:", error);
        setMessage(`エラー: ${error.message}`);
      } else {
        setMessage("ログインリンクを送信しました。メールを確認してください。");
      }
    } catch (err) {
      console.error("OTP login exception:", err);
      setMessage(`エラー: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error("Google login error:", error);
        setMessage(`エラー: ${error.message}`);
      }
    } catch (err) {
      console.error("Google login exception:", err);
      setMessage(`エラー: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 blur-lg opacity-40" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Capture & Think
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          思いついた瞬間を逃さない
        </p>
      </div>

      <form onSubmit={handlePasswordAuth} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
          minLength={6}
          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-semibold hover:from-violet-400 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "処理中..." : isSignUp ? "アカウント作成" : "ログイン"}
        </button>
      </form>

      <div className="flex justify-between text-sm">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-violet-400 hover:text-violet-300 transition-colors"
        >
          {isSignUp ? "ログインに戻る" : "アカウント作成"}
        </button>
        <button
          type="button"
          onClick={handleOtpLogin}
          disabled={loading}
          className="text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
        >
          メールリンクでログイン
        </button>
      </div>

      {message && (
        <div className={`text-center text-sm px-4 py-3 rounded-xl ${
          message.includes("エラー") 
            ? "bg-red-500/10 text-red-400 border border-red-500/20" 
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        }`}>
          {message}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-[#0a0a0b] text-white/30">または</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.08] text-white rounded-xl font-medium hover:bg-white/[0.04] hover:border-white/[0.12] transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Googleでログイン
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f12] to-[#0a0a0b]" />
      </div>
      
      <Suspense fallback={
        <div className="w-full max-w-sm text-center relative z-10">
          <p className="text-white/50">読み込み中...</p>
        </div>
      }>
        <div className="relative z-10">
          <LoginForm />
        </div>
      </Suspense>
    </div>
  );
}
