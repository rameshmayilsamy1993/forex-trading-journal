import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-lg shadow-[#2563EB]/25 hover:shadow-xl hover:shadow-[#2563EB]/30 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white shadow-lg shadow-[#DC2626]/25 hover:shadow-xl hover:shadow-[#DC2626]/30 hover:-translate-y-0.5",
        success:
          "bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white shadow-lg shadow-[#16A34A]/25 hover:shadow-xl hover:shadow-[#16A34A]/30 hover:-translate-y-0.5",
        outline:
          "border border-[#E5EAF2] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] hover:shadow-sm active:bg-[#F1F5F9]",
        secondary:
          "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] hover:shadow-sm",
        ghost:
          "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
        link: "text-[#2563EB] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-7 has-[>svg]:px-5",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
