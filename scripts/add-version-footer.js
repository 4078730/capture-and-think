const fs = require('fs');
let content = fs.readFileSync('src/app/prototype/page.tsx', 'utf8');

// Add version footer before the last </main> in the list view
const oldMain = `          </div>
        </div>
      </main>

      {/* Search modal */}`;

const newMain = `          </div>
        </div>

        {/* Version Footer */}
        <footer className="px-5 lg:px-6 py-4 border-t border-white/[0.04] mt-8">
          <div className="text-[10px] text-white/20 space-y-1">
            <div className="flex items-center gap-2">
              <span>Build: {process.env.NEXT_PUBLIC_BUILD_TIME ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("ja-JP") : "dev"}</span>
              <span className="text-white/10">|</span>
              <span className="font-mono">{process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || "local"}</span>
            </div>
            <div className="text-white/15 truncate max-w-md">
              {process.env.NEXT_PUBLIC_GIT_COMMIT_MESSAGE || "Development mode"}
            </div>
          </div>
        </footer>
      </main>

      {/* Search modal */}`;

if (content.includes(oldMain)) {
  content = content.replace(oldMain, newMain);
  fs.writeFileSync('src/app/prototype/page.tsx', content);
  console.log('Added version footer');
} else {
  console.log('Pattern not found');
}
