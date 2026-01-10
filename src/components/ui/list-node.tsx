"use client";

import * as React from "react";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { cn } from "@/lib/utils";

export function BulletedListElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="ul"
      className={cn("my-1 ml-6 list-disc [&_ul]:list-[circle] [&_ul_ul]:list-[square]", className)}
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function NumberedListElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="ol"
      className={cn("my-1 ml-6 list-decimal", className)}
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function ListItemElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="li"
      className={cn("my-0.5", className)}
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function ListItemContentElement({
  children,
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="span"
      className={cn("", className)}
      {...props}
    >
      {children}
    </PlateElement>
  );
}
