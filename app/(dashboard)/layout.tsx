import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { RecordingProvider } from "@/contexts/recording-context"
import { LayoutContent } from "@/components/layout/layout-content"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <RecordingProvider>
      <SidebarProvider defaultOpen={true}>
        <Sidebar />
        <SidebarInset>
        <LayoutContent>
          {children}
        </LayoutContent>
        </SidebarInset>
      </SidebarProvider>
    </RecordingProvider>
  )
}

