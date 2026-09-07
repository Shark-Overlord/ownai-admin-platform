import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("sheet-overlay fixed inset-0 z-50 bg-black/55", className)}
    {...props}
  />
));

SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetSides = {
  right:
    "inset-y-0 right-0 h-full border-l border-[var(--hero-ink)]/10 shadow-[-24px_0_60px_rgba(17,17,17,0.08)]",
  left:
    "inset-y-0 left-0 h-full border-r border-[var(--hero-ink)]/10 shadow-[24px_0_60px_rgba(17,17,17,0.08)]",
  top:
    "inset-x-0 top-0 border-b border-[var(--hero-ink)]/10 shadow-[0_24px_60px_rgba(17,17,17,0.08)]",
  bottom:
    "inset-x-0 bottom-0 border-t border-[var(--hero-ink)]/10 shadow-[0_-24px_60px_rgba(17,17,17,0.08)]",
} as const;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: keyof typeof sheetSides;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-side={side}
      className={cn(
        "sheet-content fixed z-50 flex w-full max-w-[360px] flex-col bg-[var(--hero-bg)] p-6 text-[var(--hero-ink)] outline-none",
        sheetSides[side],
        side === "top" || side === "bottom" ? "max-w-none" : "",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/75 text-[var(--hero-ink)] transition-colors duration-[120ms] hover:bg-[var(--hero-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
        aria-label="Close navigation menu"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));

SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-sm font-medium", className)}
    {...props}
  />
));

SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[var(--hero-muted)]", className)}
    {...props}
  />
));

SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
