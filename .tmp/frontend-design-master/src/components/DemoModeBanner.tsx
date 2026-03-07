import { Info } from "lucide-react";

export function DemoModeBanner() {
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg md:rounded-xl p-3 md:p-4 flex items-start gap-2 md:gap-3">
      <Info className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs md:text-sm text-primary">
          <span className="font-medium">Demo Mode:</span>
          <span className="hidden sm:inline"> This is a fully functional demonstration of the Memory Forensics Toolkit interface. All features work with simulated data.</span>
          <span className="sm:hidden"> Simulated data for demonstration purposes.</span>
        </p>
      </div>
    </div>
  );
}