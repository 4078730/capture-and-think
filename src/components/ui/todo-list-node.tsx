'use client';

import * as React from 'react';
import type { PlateElementProps } from 'platejs/react';
import { PlateElement } from 'platejs/react';
import { useTodoListElementState, useTodoListElement } from '@platejs/list-classic/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TodoListElement(props: PlateElementProps) {
  const { element, children } = props;
  const state = useTodoListElementState({ element });
  const { checkboxProps } = useTodoListElement(state);

  return (
    <PlateElement {...props} className="flex items-start gap-2 py-0.5">
      <button
        type="button"
        contentEditable={false}
        className={cn(
          "mt-1 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer",
          checkboxProps.checked
            ? "bg-violet-500 border-violet-500"
            : "border-white/30 hover:border-violet-400"
        )}
        onClick={(e) => {
          e.preventDefault();
          checkboxProps.onCheckedChange(!checkboxProps.checked);
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {checkboxProps.checked && (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        )}
      </button>
      <span className={cn(
        "flex-1",
        checkboxProps.checked && "line-through text-white/40"
      )}>
        {children}
      </span>
    </PlateElement>
  );
}
