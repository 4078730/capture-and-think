const fs = require('fs');
let content = fs.readFileSync('src/app/prototype/page.tsx', 'utf8');

// Move showArchived to before API hooks
const oldBlock = `export default function PrototypePage() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tasks, setTasks] = useState(mockTasks);
  // API hooks
  const { data: itemsData, isLoading, error } = useItems({ status: showArchived ? "archived" : "active" });`;

const newBlock = `export default function PrototypePage() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tasks, setTasks] = useState(mockTasks);
  const [showArchived, setShowArchived] = useState(false);

  // API hooks
  const { data: itemsData, isLoading, error } = useItems({ status: showArchived ? "archived" : "active" });`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
}

// Also remove the duplicate showArchived declaration later in the file
const duplicateShowArchived = `  const [showArchived, setShowArchived] = useState(false);
  const [draggedTask,`;

const withoutDuplicate = `  const [draggedTask,`;

if (content.includes(duplicateShowArchived)) {
  content = content.replace(duplicateShowArchived, withoutDuplicate);
}

fs.writeFileSync('src/app/prototype/page.tsx', content);
console.log('Fixed showArchived order');
