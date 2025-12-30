"use client";

import { Navigation, Sidebar } from "./navigation";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  headerActions?: React.ReactNode;
}

export function ResponsiveLayout({
  children,
  showHeader = true,
  headerTitle,
  headerActions,
}: ResponsiveLayoutProps) {
  return (
    <div className="min-h-screen md:flex">
      {/* PC Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 md:overflow-auto">
        {showHeader && (
          <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] md:hidden">
            <div className="flex items-center h-14 px-4">
              <div className="w-10" />
              {headerTitle && (
                <h1 className="flex-1 text-lg font-semibold text-center">
                  {headerTitle}
                </h1>
              )}
              {headerActions || <div className="w-10" />}
            </div>
          </header>
        )}

        <main className="pb-20 md:pb-4">{children}</main>

        {/* Mobile Navigation */}
        <Navigation />
      </div>
    </div>
  );
}
