import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { 
  SidebarContext,
  useSidebar,
  SIDEBAR_KEYBOARD_SHORTCUT
} from "@/lib/components/ui/sidebar"

const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_COLLAPSED = "4rem"

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [open, setOpen] = React.useState(defaultOpen)
    const isOpenControlled = openProp !== undefined
    const [openMobile, setOpenMobile] = React.useState(false)

    const value = React.useMemo(() => {
      const toggleSidebar = () => {
        if (isOpenControlled) {
          if (setOpenProp) {
            setOpenProp(!openProp)
          }
        } else {
          setOpen(!open)
        }
      }

      return {
        state: isMobile ? "expanded" : open ? "expanded" : "collapsed",
        open: isOpenControlled ? openProp : open,
        setOpen: (open: boolean) => {
          setOpenMobile(false)

          if (isOpenControlled) {
            if (setOpenProp) {
              setOpenProp(open)
            }
          } else {
            setOpen(open)
          }
        },
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }
    }, [
      isMobile,
      open,
      openMobile,
      isOpenControlled,
      openProp,
      setOpenProp,
    ])

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA" &&
          (event.metaKey || event.ctrlKey) &&
          event.key === SIDEBAR_KEYBOARD_SHORTCUT
        ) {
          event.preventDefault()
          value.toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [value])

    return (
      <SidebarContext.Provider value={value}>
        <TooltipProvider delayDuration={0}>
          <div
            ref={ref}
            data-state={value.state}
            className={cn(
              "relative flex h-screen w-full flex-col duration-300",
              className
            )}
            style={{
              ...style,
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
            } as React.CSSProperties}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="p-0">
          <div
            ref={ref}
            className={cn("h-full w-full", className)}
            {...props}
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border-r bg-background transition-all duration-300",
        open ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-collapsed)]",
        className
      )}
      {...props}
    />
  )
})
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-14 items-center px-4", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-1 overflow-auto py-2", className)}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-4", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      className={cn("h-9 w-9", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean
    asChild?: boolean
  }
>(({ className, active, asChild = false, ...props }, ref) => {
  const { open } = useSidebar()
  const Comp = asChild ? Slot : "div"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Comp
          ref={ref}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            active && "bg-accent text-accent-foreground",
            !open && "justify-center px-0",
            className
          )}
          {...props}
        />
      </TooltipTrigger>
      {!open && (
        <TooltipContent side="right">
          {typeof props.children === "string" ? props.children : "Menu Item"}
        </TooltipContent>
      )}
    </Tooltip>
  )
})
SidebarItem.displayName = "SidebarItem"

const SidebarSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      className={cn("my-2", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} 