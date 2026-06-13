import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20",
        secondary:
          "bg-[#F1F5F9] text-[#64748B] border border-[#E5EAF2]",
        destructive:
          "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20",
        success:
          "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20",
        warning:
          "bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20",
        outline:
          "border border-[#E5EAF2] text-[#64748B] bg-white",
        purple:
          "bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20",
        teal:
          "bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
