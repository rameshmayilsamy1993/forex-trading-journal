import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-[#9a9898] flex h-10 w-full min-w-0 rounded border border-[rgba(15,0,0,0.12)] bg-[#f8f7f7] px-3 text-[15px] text-[#201d1d] transition-all duration-150 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#201d1d] focus-visible:bg-[#fdfcfc]",
        "aria-invalid:border-[#ff3b30]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
