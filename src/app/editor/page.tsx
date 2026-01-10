'use client';

import { useState } from 'react';
import { PlateEditor } from '@/components/rich-editor/plate-editor';
import type { ADFDocument } from '@/lib/adf';

export default function Page() {
  const [value, setValue] = useState<ADFDocument | null>(null);

  const handleChange = (doc: ADFDocument, plainText: string) => {
    setValue(doc);
    console.log('Content changed:', plainText);
  };

  return (
    <div className="h-screen w-full p-4">
      <PlateEditor 
        value={value} 
        onChange={handleChange}
        placeholder="Start typing..."
      />
    </div>
  );
}
