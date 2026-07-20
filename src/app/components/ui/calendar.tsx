"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-body-sm text-slate-800",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-lg",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-slate-400 rounded-lg w-8 font-medium text-caption",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-body focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[#EDE9FE] [&:has([aria-selected].day-range-end)]:rounded-r-lg",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-lg [&:has(>.day-range-start)]:rounded-l-lg first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
            : "[&:has([aria-selected])]:rounded-lg",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100 rounded-lg hover:bg-[#F1F5F9] transition-colors duration-150",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground rounded-lg",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground rounded-lg",
        day_selected:
          "bg-[#7C3AED] text-white hover:bg-[#6D28D9] hover:text-white focus:bg-[#7C3AED] focus:text-white rounded-lg shadow-sm shadow-[#7C3AED]/25",
        day_today: "bg-[#EDE9FE] text-[#7C3AED] font-semibold rounded-lg",
        day_outside:
          "day-outside text-slate-300 aria-selected:text-muted-foreground",
        day_disabled: "text-slate-300 opacity-50",
        day_range_middle:
          "aria-selected:bg-[#EDE9FE] aria-selected:text-[#7C3AED]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
