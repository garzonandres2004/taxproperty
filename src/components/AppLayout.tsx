'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Building2,
  BarChart3,
  LayoutDashboard,
  FileText,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Calendar,
  Map
} from 'lucide-react';
import { cn } from '@/lib/ui-utils';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, active }) => (
  <Link
    href={href}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
      active
        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
    )}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session, status } = useSession();

  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { href: '/properties', icon: <Building2 size={20} />, label: 'Properties' },
    { href: '/reports/history', icon: <FileText size={20} />, label: 'Investor Reports' },
    { href: '/calendar', icon: <Calendar size={20} />, label: 'Calendar' },
    { href: '/states', icon: <Map size={20} />, label: 'States' },
    { href: '/settings', icon: <BarChart3 size={20} />, label: 'Settings' },
  ];

  const handleSignOut = async () => {
    // Try both auth methods
    try {
      await signOut({ callbackUrl: '/private', redirect: false });
    } catch (e) {
      // NextAuth not configured
    }
    // Simple auth logout
    await fetch('/api/auth/simple', { method: 'DELETE' });
    window.location.href = '/private';
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-slate-900 p-1.5 rounded-lg">
            <Building2 className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">TaxProperty</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-6">
            {session?.user?.image ? (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {getInitials(session?.user?.name)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">
                {session?.user?.name || 'Loading...'}
              </span>
              <span className="text-xs text-slate-500 truncate max-w-[140px]">
                {session?.user?.email || ''}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} className="text-slate-600" />
            </button>
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">TaxProperty</h1>
          </div>

          <div className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-1.5 w-96">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search parcel, address, or owner..."
              className="bg-transparent border-none focus:ring-0 text-sm w-full ml-2 text-slate-700"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">PRO</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-72 bg-white p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Building2 className="text-slate-900" size={24} />
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">TaxProperty</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} className="text-slate-600" />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={pathname === item.href}
                />
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100">
              {session?.user && (
                <div className="flex items-center gap-3 px-2 mb-4">
                  {session.user.image ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                      {getInitials(session.user.name)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      {session.user.name || 'User'}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">
                      {session.user.email || ''}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 transition-colors w-full"
              >
                <LogOut size={20} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
