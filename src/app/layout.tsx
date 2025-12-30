import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { VersionFooter } from "@/components/version-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capture & Think",
  description: "思いついた瞬間を逃さない、超シンプルなメモ・思考整理システム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Capture & Think",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <VersionFooter />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
