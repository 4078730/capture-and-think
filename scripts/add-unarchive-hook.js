const fs = require('fs');
let content = fs.readFileSync('src/hooks/use-items.ts', 'utf8');

// Add useUnarchiveItem after useArchiveItem
const unarchiveHook = `

export function useUnarchiveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(\`/api/items/\${id}/unarchive\`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to unarchive item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}`;

// Find the end of useArchiveItem and insert after it
const archiveEndPattern = /export function useArchiveItem\(\)[\s\S]*?\n\}\n/;
const match = content.match(archiveEndPattern);

if (match && !content.includes('useUnarchiveItem')) {
  const insertPos = match.index + match[0].length;
  content = content.slice(0, insertPos) + unarchiveHook + content.slice(insertPos);
  fs.writeFileSync('src/hooks/use-items.ts', content);
  console.log('Added useUnarchiveItem hook');
} else if (content.includes('useUnarchiveItem')) {
  console.log('useUnarchiveItem already exists');
} else {
  console.log('Pattern not found');
}
