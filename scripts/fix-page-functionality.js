const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Update import to include useUnarchiveItem
const oldImport = `import { useItems, useUpdateItem, useCreateItem, useArchiveItem, usePinItem } from "@/hooks/use-items";`;
const newImport = `import { useItems, useUpdateItem, useCreateItem, useArchiveItem, useUnarchiveItem, usePinItem } from "@/hooks/use-items";`;

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('1. Updated import');
}

// 2. Add unarchiveItemMutation after archiveItemMutation
const oldHooks = `  const archiveItemMutation = useArchiveItem();
  const pinItemMutation = usePinItem();`;

const newHooks = `  const archiveItemMutation = useArchiveItem();
  const unarchiveItemMutation = useUnarchiveItem();
  const pinItemMutation = usePinItem();`;

if (content.includes(oldHooks)) {
  content = content.replace(oldHooks, newHooks);
  console.log('2. Added unarchiveItemMutation');
}

// 3. Update handleArchiveNote to toggle based on note status
const oldArchiveHandler = `  // アーカイブ/復元
    const handleArchiveNote = useCallback(async (noteId: string) => {
    try {
      await archiveItemMutation.mutateAsync(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error("Archive failed:", err);
    }
  }, [archiveItemMutation, selectedNote]);`;

const newArchiveHandler = `  // アーカイブ/復元トグル
  const handleArchiveNote = useCallback(async (noteId: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await unarchiveItemMutation.mutateAsync(noteId);
      } else {
        await archiveItemMutation.mutateAsync(noteId);
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (err) {
      console.error("Archive/Unarchive failed:", err);
    }
  }, [archiveItemMutation, unarchiveItemMutation, selectedNote]);

  // ピントグル
  const handlePinNote = useCallback(async (noteId: string, isPinned: boolean) => {
    try {
      await pinItemMutation.mutateAsync({ id: noteId, pinned: !isPinned });
    } catch (err) {
      console.error("Pin failed:", err);
    }
  }, [pinItemMutation]);`;

if (content.includes(oldArchiveHandler)) {
  content = content.replace(oldArchiveHandler, newArchiveHandler);
  console.log('3. Updated handleArchiveNote and added handlePinNote');
}

// 4. Update archive button onClick to pass isArchived parameter
const oldArchiveButton = `onClick={() => handleArchiveNote(selectedNote.id)}`;
const newArchiveButton = `onClick={() => handleArchiveNote(selectedNote.id, selectedNote.archived)}`;

content = content.replace(oldArchiveButton, newArchiveButton);
console.log('4. Updated archive button onClick');

// 5. Add onClick to pin button
const oldPinButton = `                <button className={cn(
                  "p-2 rounded-lg transition-all",
                  selectedNote.pinned ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                )}>
                  <Pin className="w-4 h-4" />
                </button>`;

const newPinButton = `                <button
                  onClick={() => handlePinNote(selectedNote.id, selectedNote.pinned)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    selectedNote.pinned ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  )}
                  title={selectedNote.pinned ? "ピン解除" : "ピン留め"}
                >
                  <Pin className="w-4 h-4" />
                </button>`;

if (content.includes(oldPinButton)) {
  content = content.replace(oldPinButton, newPinButton);
  console.log('5. Added onClick to pin button');
}

fs.writeFileSync('src/app/page.tsx', content);
console.log('Done!');
