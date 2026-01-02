const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Add loading and empty state before the notes grid
const oldGrid = `        <div className="p-5 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredNotes.map((note, index) => {`;

const newGrid = `        <div className="p-5 lg:p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <p className="text-white/40 text-sm">読み込み中...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white/60 font-medium">データの読み込みに失敗しました</p>
                  <p className="text-white/30 text-sm mt-1">ページを更新してください</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredNotes.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-violet-400" />
                </div>
                <div>
                  <p className="text-white/60 font-medium">
                    {showArchived ? "アーカイブされたノートはありません" : "ノートがありません"}
                  </p>
                  <p className="text-white/30 text-sm mt-1">
                    {showArchived ? "アーカイブにはまだ何もありません" : "新しいノートを作成してみましょう"}
                  </p>
                </div>
                {!showArchived && (
                  <button
                    onClick={handleCreateNote}
                    className="mt-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 inline-block mr-1" />
                    新規ノート作成
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notes Grid */}
          {!isLoading && !error && filteredNotes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredNotes.map((note, index) => {`;

if (content.includes(oldGrid)) {
  content = content.replace(oldGrid, newGrid);
  console.log('1. Added loading, error, and empty states');
}

// Close the conditional wrapper for the grid
const oldGridEnd = `            <button
              onClick={handleCreateNote}
              className="group min-h-[200px] rounded-2xl border-2 border-dashed border-white/[0.04] hover:border-violet-500/30 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-violet-500/[0.02]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] group-hover:bg-violet-500/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-90">
                <Plus className="w-6 h-6 text-white/20 group-hover:text-violet-400 transition-colors duration-300" />
              </div>
              <span className="text-[13px] text-white/25 group-hover:text-violet-400/70 font-medium transition-colors duration-300">New note</span>
            </button>
          </div>
        </div>

        {/* Version Footer */}`;

const newGridEnd = `            <button
              onClick={handleCreateNote}
              className="group min-h-[200px] rounded-2xl border-2 border-dashed border-white/[0.04] hover:border-violet-500/30 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-violet-500/[0.02]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] group-hover:bg-violet-500/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-90">
                <Plus className="w-6 h-6 text-white/20 group-hover:text-violet-400 transition-colors duration-300" />
              </div>
              <span className="text-[13px] text-white/25 group-hover:text-violet-400/70 font-medium transition-colors duration-300">New note</span>
            </button>
          </div>
          )}
        </div>

        {/* Version Footer */}`;

if (content.includes(oldGridEnd)) {
  content = content.replace(oldGridEnd, newGridEnd);
  console.log('2. Added closing bracket for conditional grid');
}

fs.writeFileSync('src/app/page.tsx', content);
console.log('Done!');
