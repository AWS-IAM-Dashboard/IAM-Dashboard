import type { ReactNode } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  icon?: ReactNode;
};

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className ?? "cyber-card"}>
      <CardContent className="py-12">
        <div className="mx-auto max-w-xl text-center space-y-4">
          {icon ? (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/20 text-primary">
              {icon}
            </div>
          ) : null}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {(primaryAction || secondaryAction) ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-2">
              {primaryAction ? (
                <Button
                  onClick={primaryAction.onClick}
                  className={primaryAction.variant === "default" || !primaryAction.variant ? "cyber-glow" : undefined}
                  variant={primaryAction.variant ?? "default"}
                >
                  {primaryAction.icon ? <span className="mr-2">{primaryAction.icon}</span> : null}
                  {primaryAction.label}
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button onClick={secondaryAction.onClick} variant={secondaryAction.variant ?? "outline"}>
                  {secondaryAction.icon ? <span className="mr-2">{secondaryAction.icon}</span> : null}
                  {secondaryAction.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

