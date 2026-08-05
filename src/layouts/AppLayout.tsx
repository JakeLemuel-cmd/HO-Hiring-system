import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  Search,
  ClipboardList,
  FileText,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { canManageStaff, canManageSettings, canViewAuditLogs } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItem = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, logout } = useAuth();
  const role = profile?.role;
  return (
    <nav className="flex h-[calc(100%-3.5rem)] flex-col justify-between p-3">
      <div className="space-y-1">
      <NavLink to="/admin/dashboard" className={navItem} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </NavLink>
      <NavLink to="/admin/categories" className={navItem} onClick={onNavigate}>
        <FolderKanban className="h-4 w-4" /> Hiring Categories
      </NavLink>
      <NavLink to="/admin/examinations" className={navItem} onClick={onNavigate}>
        <FileText className="h-4 w-4" /> Examinations
      </NavLink>
      <NavLink to="/admin/applicants" className={navItem} onClick={onNavigate}>
        <Search className="h-4 w-4" /> Applicant Search
      </NavLink>
      {role && canManageStaff(role) && (
        <NavLink to="/admin/users" className={navItem} onClick={onNavigate}>
          <Users className="h-4 w-4" /> Staff Users
        </NavLink>
      )}
      {role && canManageSettings(role) && (
        <NavLink to="/admin/settings" className={navItem} onClick={onNavigate}>
          <Settings className="h-4 w-4" /> Settings
        </NavLink>
      )}
      {role && canViewAuditLogs(role) && (
        <NavLink to="/admin/audit-logs" className={navItem} onClick={onNavigate}>
          <ScrollText className="h-4 w-4" /> Audit Logs
        </NavLink>
      )}
      </div>
      <button
        onClick={() => {
          onNavigate?.();
          logout();
        }}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold text-foreground">
      <ClipboardList className="h-5 w-5 text-primary" />
      Hiring Exam System
    </div>
  );
}

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function AppLayout() {
  const { profile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-64 shrink-0 lg:block" />
      <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-card lg:block">
        <SidebarBrand />
        <NavItems />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand />
          <NavItems onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>{initials(profile?.firstName, profile?.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left sm:block">
                    <span className="block leading-tight text-foreground">
                      {profile?.firstName} {profile?.lastName}
                    </span>
                    <span className="block text-xs capitalize leading-tight text-muted-foreground">
                      {profile?.role.replace("_", " ")}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {profile?.firstName} {profile?.lastName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
