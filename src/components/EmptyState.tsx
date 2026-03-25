import { useState, type ReactNode } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "./ui/utils";

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  icon?: ReactNode;
};

export interface GuideStep {
  title: string;
  description: string;
  icon: ReactNode;
  action?: EmptyStateAction;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  steps?: GuideStep[];
}

function StepGuide({ steps }: { steps: GuideStep[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleStepAction = (stepIndex: number, action?: EmptyStateAction) => {
    setCompletedSteps((prev) => new Set(prev).add(stepIndex));
    action?.onClick();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className="flex items-center gap-1 sm:gap-2"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300",
                completedSteps.has(i)
                  ? "border-primary bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "border-primary bg-primary/10 text-primary scale-110"
                    : "border-border bg-muted/20 text-muted-foreground"
              )}
            >
              {completedSteps.has(i) ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-4 sm:w-8 transition-colors duration-300",
                  completedSteps.has(i) ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-md text-center space-y-4 min-h-[180px] flex flex-col justify-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform duration-300">
          {step.icon}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {step.action && (
          <div className="pt-1">
            <Button
              onClick={() => handleStepAction(currentStep, step.action)}
              className={step.action.variant === "default" || !step.action.variant ? "cyber-glow" : undefined}
              variant={step.action.variant ?? "default"}
            >
              {step.action.icon ? <span className="mr-2">{step.action.icon}</span> : null}
              {step.action.label}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep((p) => p - 1)}
          disabled={isFirstStep}
          className={isFirstStep ? "invisible" : ""}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <p className="text-xs text-muted-foreground">
          {completedSteps.size} of {steps.length} completed
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep((p) => p + 1)}
          disabled={isLastStep}
          className={isLastStep ? "invisible" : ""}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  steps,
}: EmptyStateProps) {
  return (
    <Card className={className ?? "cyber-card"}>
      <CardContent className="py-10">
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
        </div>

        {steps ? (
          <div className="mx-auto max-w-lg mt-8">
            <StepGuide steps={steps} />
          </div>
        ) : (primaryAction || secondaryAction) ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-4">
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
      </CardContent>
    </Card>
  );
}
