const fs = require('fs');
let content = fs.readFileSync('src/app/prototype/page.tsx', 'utf8');

// 1. Fix auto-save (lines 1703-1714)
const oldAutoSave = `    saveTimeoutRef.current = setTimeout(() => {
      // プレーンテキストをADF形式に変換して保存
      const newAdfContent = plainTextToADF(editingContent);
      setNotes(prev => prev.map(n =>
        n.id === selectedNote.id
          ? { ...n, title: editingTitle, adfContent: newAdfContent, updatedAt: "たった今" }
          : n
      ));
      setSaveStatus("saved");
      // 2秒後にidle状態に
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);`;

const newAutoSave = `    saveTimeoutRef.current = setTimeout(async () => {
      // プレーンテキストをADF形式に変換して保存
      const newAdfContent = plainTextToADF(editingContent);
      try {
        await updateItem.mutateAsync({
          id: selectedNote.id,
          body: editingContent,
          summary: editingTitle || null,
          adf_content: newAdfContent,
        });
        setSaveStatus("saved");
        // 2秒後にidle状態に
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("idle");
      }
    }, 500);`;

if (content.includes(oldAutoSave)) {
  content = content.replace(oldAutoSave, newAutoSave);
  console.log('Fixed auto-save');
}

// 2. Fix note link click save (lines 1760-1764)
const oldNoteLinkSave = `      if (selectedNote) {
        // 現在のノートを保存してから開く（プレーンテキストをADFに変換）
        const newAdfContent = plainTextToADF(editingContent);
        setNotes(prev => prev.map(n =>
          n.id === selectedNote.id ? { ...n, title: editingTitle, adfContent: newAdfContent } : n
        ));
      }`;

const newNoteLinkSave = `      if (selectedNote) {
        // 現在のノートを保存してから開く（プレーンテキストをADFに変換）
        const newAdfContent = plainTextToADF(editingContent);
        updateItem.mutate({
          id: selectedNote.id,
          body: editingContent,
          summary: editingTitle || null,
          adf_content: newAdfContent,
        });
      }`;

if (content.includes(oldNoteLinkSave)) {
  content = content.replace(oldNoteLinkSave, newNoteLinkSave);
  console.log('Fixed note link save');
}

// 3. Fix drag & drop bucket change (lines 1825-1827)
const oldDragDrop = `    setNotes(prev => prev.map(n =>
      n.id === draggedNote ? { ...n, bucket: bucketId } : n
    ));`;

const newDragDrop = `    updateItem.mutate({
      id: draggedNote,
      bucket: bucketId as Bucket || null,
    });`;

if (content.includes(oldDragDrop)) {
  content = content.replace(oldDragDrop, newDragDrop);
  console.log('Fixed drag drop');
}

// 4. Fix generate tags (lines 1916-1918)
const oldGenerateTags = `    setNotes(notes.map(n =>
      n.id === selectedNote.id ? { ...n, tags: [...new Set([...n.tags, ...newTags])] } : n
    ));`;

const newGenerateTags = `    // Tags are managed by the backend, no local update needed`;

if (content.includes(oldGenerateTags)) {
  content = content.replace(oldGenerateTags, newGenerateTags);
  console.log('Fixed generate tags');
}

// Update the useEffect dependency to include updateItem
const oldDep = `  }, [editingTitle, editingContent, editingMedia, selectedNote?.id]);`;
const newDep = `  }, [editingTitle, editingContent, editingMedia, selectedNote?.id, updateItem]);`;

if (content.includes(oldDep)) {
  content = content.replace(oldDep, newDep);
  console.log('Fixed useEffect dependency');
}

fs.writeFileSync('src/app/prototype/page.tsx', content);
console.log('All setNotes calls fixed');
