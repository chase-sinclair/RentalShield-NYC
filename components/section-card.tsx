import type { PropsWithChildren, ReactNode } from "react";

import { Card } from "@/components/ui/card";

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionCard({ eyebrow, title, description, action, children }: SectionCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
        {children}
      </div>
    </Card>
  );
}
