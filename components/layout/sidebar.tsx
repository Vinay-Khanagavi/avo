"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mic, BookOpen, Settings, LogOut, History, PanelLeft, PanelRight, Menu, X } from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dictation", label: "Dictation", icon: Mic },
  { href: "/dictionary", label: "Dictionary", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

function AVOLogo({ collapsed }: { collapsed: boolean }) {
  const { toggleSidebar } = useSidebar()

  if (collapsed) {
    return (
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
        aria-label="Open Sidebar"
      >
        <PanelRight className="h-4 w-4" />
      </button>
    )
  }

  return (
    <Link href="/dictation" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black dark:bg-white transition-colors">
        <div className="w-4 h-4 rounded-sm bg-white dark:bg-black transition-colors"></div>
      </div>
      <span className="text-xl font-semibold font-sans">AVO</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { state, setOpenMobile } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between p-2">
          <AVOLogo collapsed={isCollapsed} />
          {!isCollapsed && (
            <SidebarTrigger className="h-7 w-7 ml-auto">
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">Toggle Sidebar</span>
            </SidebarTrigger>
          )}
      </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.label}
                className={cn(
                  isActive && "bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700",
                  !isActive && "hover:bg-gray-200/70 dark:hover:bg-gray-700/60",
                  "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                  !isActive && "active:bg-gray-200/70 dark:active:bg-gray-700/60"
                )}
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    // Close mobile sidebar when a nav link is clicked so the menu doesn't remain open on navigation
                    try {
                      setOpenMobile(false)
                    } catch (e) {
                      // ignore
                    }
                  }}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white focus-visible:ring-0 focus-visible:ring-offset-0 active:bg-red-500 active:text-white dark:active:bg-red-500 dark:active:text-white"
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  )
}

