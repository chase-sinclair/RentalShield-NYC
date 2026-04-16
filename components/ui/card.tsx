import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-soft backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
