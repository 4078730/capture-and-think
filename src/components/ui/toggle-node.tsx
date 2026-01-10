'use client';

import * as React from 'react';
import type { PlateElementProps } from 'platejs/react';
import { useToggleButton, useToggleButtonState } from '@platejs/toggle/react';
import { ChevronRight } from 'lucide-react';
import { PlateElement } from 'platejs/react';
import { cn } from '@/lib/utils';

export function ToggleElement(props: PlateElementProps) {
  const element = props.element;
  const state = useToggleButtonState(element.id as string);
  const { buttonProps, open } = useToggleButton(state);

  return (
    <PlateElement {...props} className="relative pl-6">
      <button
        type="button"
        className={cn(
          "absolute -left-0.5 top-0 size-6 cursor-pointer select-none",
          "inline-flex items-center justify-center rounded-md p-px",
          "text-muted-foreground transition-colors hover:bg-accent",
          "[&_svg]:size-4"
        )}
        contentEditable={false}
        {...buttonProps}
      >
        <ChevronRight
          className={cn(
            "transition-transform duration-75",
            open ? "rotate-90" : "rotate-0"
          )}
        />
      </button>
      {props.children}
    </PlateElement>
  );
}
