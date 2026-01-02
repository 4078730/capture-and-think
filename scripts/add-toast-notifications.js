const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Add toast import
const oldImports = `import { cn } from "@/lib/utils";`;
const newImports = `import { cn } from "@/lib/utils";
import { toast } from "sonner";`;

if (content.includes(oldImports) && !content.includes('import { toast }')) {
  content = content.replace(oldImports, newImports);
  console.log('1. Added toast import');
}

// 2. Update handleCreateNote to show toast on success
const oldCreateNote = `  // 新規ノート作成
  const handleCreateNote = useCallback(async () => {
    try {
      const newItem = await createItem.mutateAsync({
        body: "新しいノート",
        bucket: (selectedBucket as Bucket) || undefined,
      });
      const note = itemToNote(newItem);
      handleOpenNote(note);
    } catch (err) {
      console.error("Create failed:", err);
    }
  }, [createItem, selectedBucket]);`;

const newCreateNote = `  // 新規ノート作成
  const handleCreateNote = useCallback(async () => {
    try {
      const newItem = await createItem.mutateAsync({
        body: "新しいノート",
        bucket: (selectedBucket as Bucket) || undefined,
      });
      const note = itemToNote(newItem);
      handleOpenNote(note);
      toast.success("新しいノートを作成しました");
    } catch (err) {
      console.error("Create failed:", err);
      toast.error("ノートの作成に失敗しました");
    }
  }, [createItem, selectedBucket]);`;

if (content.includes(oldCreateNote)) {
  content = content.replace(oldCreateNote, newCreateNote);
  console.log('2. Added toast to handleCreateNote');
}

// 3. Update handleArchiveNote to show toast
const oldArchiveNote = `  // アーカイブ/復元トグル
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
  }, [archiveItemMutation, unarchiveItemMutation, selectedNote]);`;

const newArchiveNote = `  // アーカイブ/復元トグル
  const handleArchiveNote = useCallback(async (noteId: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await unarchiveItemMutation.mutateAsync(noteId);
        toast.success("アーカイブを解除しました");
      } else {
        await archiveItemMutation.mutateAsync(noteId);
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
        toast.success("アーカイブしました");
      }
    } catch (err) {
      console.error("Archive/Unarchive failed:", err);
      toast.error("操作に失敗しました");
    }
  }, [archiveItemMutation, unarchiveItemMutation, selectedNote]);`;

if (content.includes(oldArchiveNote)) {
  content = content.replace(oldArchiveNote, newArchiveNote);
  console.log('3. Added toast to handleArchiveNote');
}

// 4. Update handlePinNote to show toast
const oldPinNote = `  // ピントグル
  const handlePinNote = useCallback(async (noteId: string, isPinned: boolean) => {
    try {
      await pinItemMutation.mutateAsync({ id: noteId, pinned: !isPinned });
    } catch (err) {
      console.error("Pin failed:", err);
    }
  }, [pinItemMutation]);`;

const newPinNote = `  // ピントグル
  const handlePinNote = useCallback(async (noteId: string, isPinned: boolean) => {
    try {
      await pinItemMutation.mutateAsync({ id: noteId, pinned: !isPinned });
      toast.success(isPinned ? "ピンを解除しました" : "ピン留めしました");
    } catch (err) {
      console.error("Pin failed:", err);
      toast.error("操作に失敗しました");
    }
  }, [pinItemMutation]);`;

if (content.includes(oldPinNote)) {
  content = content.replace(oldPinNote, newPinNote);
  console.log('4. Added toast to handlePinNote');
}

// 5. Update auto-save to show toast on error only (save success is already shown by status indicator)
const oldAutoSave = `      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("idle");
      }
    }, 500);`;

const newAutoSave = `      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("idle");
        toast.error("保存に失敗しました");
      }
    }, 500);`;

if (content.includes(oldAutoSave) && !content.includes('toast.error("保存に失敗しました")')) {
  content = content.replace(oldAutoSave, newAutoSave);
  console.log('5. Added toast to auto-save error');
}

fs.writeFileSync('src/app/page.tsx', content);
console.log('Done!');
