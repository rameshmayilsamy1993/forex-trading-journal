import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-[#9a9898] flex field-sizing-content min-h-24 w-full rounded border border-[rgba(15,0,0,0.12)] bg-[#f8f7f7] px-3 py-2.5 text-[15px] text-[#201d1d] transition-all duration-150 outline-none focus-visible:border-[#201d1d] focus-visible:bg-[#fdfcfc] aria-invalid:border-[#ff3b30] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
