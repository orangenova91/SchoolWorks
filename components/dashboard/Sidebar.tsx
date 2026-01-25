"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// SidebarItem 타입 정의
type SidebarItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  iconName?: string;
  external?: boolean;
  dividerBefore?: boolean;
};

interface SidebarProps {
  items: SidebarItem[];
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
}

export function Sidebar({ items, schoolName, schoolLogoUrl }: SidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1730);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const sidebarExpanded = isLargeScreen || isExpanded;

  if (!mounted) return <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-16 border-r bg-white/80" />;

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white/80 backdrop-blur-lg z-40 border-r border-white/20 transition-[width] duration-300 ease-out overflow-hidden shadow-lg",
        isLargeScreen ? "w-[260px]" : (isExpanded ? "w-[260px]" : "w-16")
      )}
      onMouseEnter={() => !isLargeScreen && setIsExpanded(true)}
      onMouseLeave={() => !isLargeScreen && setIsExpanded(false)}
    >
      <nav aria-label="Dashboard navigation" className="h-full p-4">
        {schoolLogoUrl && (
          <div className={cn(
            "flex items-center gap-3 px-2 py-2 rounded-xl bg-white/70 border border-white/60 shadow-sm transition-all duration-200",
            sidebarExpanded ? "justify-start" : "justify-center"
          )}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-blue-100 overflow-hidden flex-shrink-0">
              <img src={schoolLogoUrl} alt="학교 로고" className="w-full h-full object-cover" />
            </span>
            <span className={cn(
              "text-sm font-semibold text-gray-800 whitespace-nowrap transition-all duration-200",
              sidebarExpanded ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
            )}>
              {schoolName || "학교"}
            </span>
          </div>
        )}

        <ul className={cn("space-y-3", schoolLogoUrl ? "mt-4" : "")}>
          {items.map((item) => {
            // --- 수정된 핵심 로직 시작 ---
            // 1. 대시보드 메인(최상위) 경로 리스트 정의
            const dashboardHomePaths = ["/dashboard", "/dashboard/teacher", "/dashboard/student"];
            
            // 2. 만약 현재 아이템이 메인 경로 중 하나라면 '정확히 일치'해야 활성화
            // 3. 그 외의 하위 메뉴(일정, 게시판 등)는 '시작 경로'가 일치하면 활성화
            const isActive = dashboardHomePaths.includes(item.href)
              ? pathname === item.href
              : pathname.startsWith(item.href);
            // --- 수정된 핵심 로직 끝 ---

            return (
              <li key={item.href}>
                {item.dividerBefore && (
                  <div className={cn(
                    "my-2 border-t border-gray-200/70 transition-all",
                    sidebarExpanded ? "mx-0" : "mx-2"
                  )} />
                )}

                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    sidebarExpanded ? "gap-3 justify-start" : "gap-0 justify-center",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-blue-700 hover:bg-blue-100"
                  )}
                >
                  {item.icon && <span className="w-5 h-5 flex-shrink-0 text-inherit">{item.icon}</span>}
                  <span className={cn(
                    "whitespace-nowrap transition-all duration-200",
                    sidebarExpanded ? "opacity-100 max-w-[160px] ml-2" : "opacity-0 max-w-0"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}