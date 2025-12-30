const fs = require('fs');
let content = fs.readFileSync('src/app/prototype/page.tsx', 'utf8');

// Replace handleCreateNote
const oldCreateNote = `  // 新規ノート作成
  const handleCreateNote = useCallback(() => {
    const colors = ["amber", "blue", "emerald", "rose", "violet", "cyan"];
    const newNote: Note = {
      id: \`n\${Date.now()}\`,
      title: "新しいノート",
      adfContent: createEmptyADFDocument(),
      bucket: selectedBucket || "management",
      pinned: false,
      color: colors[Math.floor(Math.random() * colors.length)],
      updatedAt: "たった今",
      tags: [],
      archived: false,
    };
    setNotes(prev => [newNote, ...prev]);
    handleOpenNote(newNote);
  }, [selectedBucket]);`;

const newCreateNote = `  // 新規ノート作成
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

if (content.includes(oldCreateNote)) {
  content = content.replace(oldCreateNote, newCreateNote);
  console.log('Replaced handleCreateNote');
} else {
  console.log('handleCreateNote pattern not found');
}

fs.writeFileSync('src/app/prototype/page.tsx', content);
console.log('Done');
