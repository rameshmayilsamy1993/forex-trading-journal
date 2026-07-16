import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-button font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow-md shadow-[#7C3AED]/20 hover:shadow-lg hover:shadow-[#7C3AED]/25 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white shadow-md shadow-[#DC2626]/20 hover:shadow-lg hover:shadow-[#DC2626]/25 hover:-translate-y-0.5",
        success:
          "bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white shadow-md shadow-[#16A34A]/20 hover:shadow-lg hover:shadow-[#16A34A]/25 hover:-translate-y-0.5",
        outline:
          "border border-white/10 bg-white/5 text-[#F1F5F9] hover:bg-white/10 hover:border-white/20 hover:shadow-sm active:bg-white/[0.08]",
        secondary:
          "bg-white/5 text-[#F1F5F9] hover:bg-white/10 hover:shadow-sm",
        ghost:
          "text-[#94A3B8] hover:bg-white/5 hover:text-[#F1F5F9]",
        link: "text-[#7C3AED] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] px-3.5 py-2 has-[>svg]:px-3",
        sm: "h-[28px] rounded-md gap-1.5 px-2.5 has-[>svg]:px-2 text-micro",
        lg: "h-[38px] rounded-lg px-4 has-[>svg]:px-3.5",
        icon: "size-[34px] rounded-lg",
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
