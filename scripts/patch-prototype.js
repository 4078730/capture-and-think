const fs = require('fs');

let content = fs.readFileSync('src/app/prototype/page.tsx', 'utf8');

// Add bucketColorMap and itemToNote before the component
const componentStart = 'export default function PrototypePage()';
const helperCode = `// Map bucket from DB to local color
const bucketColorMap: Record<string, string> = {
  work: "amber",
  video: "blue",
  life: "rose",
  boardgame: "cyan",
};

// Convert Item from API to Note for UI
function itemToNote(item: Item): Note {
  const color = bucketColorMap[item.bucket || ""] || "violet";
  return {
    id: item.id,
    title: item.summary || item.body.slice(0, 50) || "Untitled",
    adfContent: item.adf_content || plainTextToADF(item.body),
    bucket: item.bucket || "",
    pinned: item.pinned,
    color,
    updatedAt: new Date(item.updated_at).toLocaleDateString("ja-JP"),
    tags: item.auto_tags || [],
    archived: item.status === "archived",
  };
}

`;

if (!content.includes('function itemToNote')) {
  content = content.replace(componentStart, helperCode + componentStart);
}

// Replace mock notes with API integration
const oldNotesState = '  const [notes, setNotes] = useState(mockNotes);';
const newNotesIntegration = `  // API hooks
  const { data: itemsData, isLoading, error } = useItems({ status: showArchived ? "archived" : "active" });
  const updateItem = useUpdateItem();
  const createItem = useCreateItem();
  const archiveItemMutation = useArchiveItem();
  const pinItemMutation = usePinItem();

  // Convert API items to notes
  const notes = useMemo(() => {
    if (!itemsData?.items) return [];
    return itemsData.items.map(itemToNote);
  }, [itemsData?.items]);`;

if (content.includes(oldNotesState)) {
  content = content.replace(oldNotesState, newNotesIntegration);
}

// Update handleCreateNote to use API
const oldCreateNote = `  const handleCreateNote = useCallback(() => {
    const bucketForNote = selectedBucket || "work";
    const newNote: Note = {
      id: \`n\${Date.now()}\`,
      title: "新しいメモ",
      adfContent: { version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] },
      bucket: bucketForNote,
      pinned: false,
      color: colorConfig[bucketForNote] ? Object.keys(colorConfig).find(k => colorConfig[k] === colorConfig[bucketForNote]) || "violet" : "violet",
      updatedAt: "たった今",
      tags: [],
      archived: false,
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
  }, [selectedBucket]);`;

const newCreateNote = `  const handleCreateNote = useCallback(async () => {
    try {
      const newItem = await createItem.mutateAsync({
        body: "新しいメモ",
        bucket: (selectedBucket as Bucket) || undefined,
      });
      const note = itemToNote(newItem);
      setSelectedNote(note);
      setEditingTitle(note.title);
      setEditingContent(adfToPlainText(note.adfContent));
    } catch (err) {
      console.error("Create failed:", err);
    }
  }, [createItem, selectedBucket]);`;

if (content.includes('const handleCreateNote = useCallback(() => {')) {
  // Find and replace the entire function
  const createNoteRegex = /const handleCreateNote = useCallback\(\(\) => \{[\s\S]*?setSelectedNote\(newNote\);\s*\}, \[selectedBucket\]\);/;
  content = content.replace(createNoteRegex, newCreateNote);
}

// Update handleArchiveNote to use API
const oldArchiveNote = `  const handleArchiveNote = useCallback((noteId: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, archived: !n.archived } : n));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  }, [selectedNote]);`;

const newArchiveNote = `  const handleArchiveNote = useCallback(async (noteId: string) => {
    try {
      await archiveItemMutation.mutateAsync(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error("Archive failed:", err);
    }
  }, [archiveItemMutation, selectedNote]);`;

if (content.includes('const handleArchiveNote = useCallback((noteId: string) => {')) {
  const archiveNoteRegex = /const handleArchiveNote = useCallback\(\(noteId: string\) => \{[\s\S]*?\}, \[selectedNote\]\);/;
  content = content.replace(archiveNoteRegex, newArchiveNote);
}

fs.writeFileSync('src/app/prototype/page.tsx', content);
console.log('Prototype patched successfully');
