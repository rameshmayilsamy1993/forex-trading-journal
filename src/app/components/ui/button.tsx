import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-button font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] aria-invalid:border-[#ff3b30] active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[#201d1d] text-[#fdfcfc] hover:bg-[#0f0000] active:bg-[#0f0000]",
        destructive:
          "bg-[#ff3b30] text-white hover:bg-[#d70015] active:bg-[#a50011]",
        success:
          "bg-[#30d158] text-white hover:bg-[#26a847] active:bg-[#1d8737]",
        outline:
          "border border-[#646262] bg-[#fdfcfc] text-[#201d1d] hover:bg-[#f8f7f7] active:bg-[#f1eeee]",
        secondary:
          "bg-[#f1eeee] text-[#201d1d] hover:bg-[#e5e3e3] active:bg-[#d9d7d7]",
        ghost:
          "text-[#424245] hover:bg-[#f8f7f7] hover:text-[#201d1d] active:bg-[#f1eeee]",
        link:
          "text-[#007aff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-1 has-[>svg]:px-3",
        sm: "h-7 rounded gap-1.5 px-2.5 has-[>svg]:px-2 text-[13px]",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
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
