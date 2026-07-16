import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-[42px] w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-input transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/20 focus-visible:ring-2",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "text-[#0F172A]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
