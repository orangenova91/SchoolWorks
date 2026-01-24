"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileModal from "./ProfileModal";

interface UserMenuProps {
  userName: string;
  userEmail: string;
  userRole: string;
  userStudentId?: string | null;
  userStudentIds?: string[] | null;
  schoolName?: string | null;
}

export default function UserMenu({
  userName,
  userEmail,
  userRole,
  userStudentId,
  userStudentIds,
  schoolName,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      student: "학생",
      teacher: "교사",
      admin: "관리자",
      parent: "학부모",
      superadmin: "슈퍼관리자",
    };
    return roleMap[role] || role;
  };

  const studentIdLabel = (() => {
    if (userRole === "student") {
      return userStudentId || null;
    }
    if (userRole === "parent") {
      const ids = (userStudentIds || []).filter(Boolean);
      return ids.length ? ids.join(", ") : null;
    }
    return null;
  })();

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
    setIsOpen(false);
  };

  const handleLogout = () => {
    signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <div className="flex items-center space-x-2" ref={menuRef}>
      {schoolName && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {schoolName}
        </span>
      )}
      {userRole && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
          {getRoleLabel(userRole)}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsOpen(true)}
          className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            {studentIdLabel && <span> {studentIdLabel}</span>}
            <span>{userName || userEmail}</span>
          </div>
          <svg
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
            onMouseLeave={() => setIsOpen(false)}
          >
            <button
              onClick={handleProfileClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>프로필 보기</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

