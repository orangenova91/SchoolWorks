"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileModal from "@/components/dashboard/ProfileModal";

interface UserMenuProps {
  userName: string | null | undefined;
  userEmail: string;
  userRole: string | null | undefined;
  userSchool: string | null | undefined;
}

export default function UserMenu({
  userName,
  userEmail,
  userRole,
  userSchool,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const router = useRouter();

  const getProfilePath = () => {
    switch (userRole) {
      case "student":
        return "/dashboard/student/profile";
      case "teacher":
        return "/dashboard/teacher"; // teacher 프로필 페이지가 없으면 대시보드로
      case "admin":
        return "/dashboard/admin/overview"; // admin 프로필 페이지가 없으면 대시보드로
      case "superadmin":
        return "/dashboard/superadmin"; // superadmin 프로필 페이지가 없으면 대시보드로
      default:
        return "/dashboard";
    }
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut({ redirect: true, callbackUrl: "/login" });
  };

  const displayName = userName || userEmail;

  return (
    <div 
      className="relative" 
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        {userSchool && (
          <>
            <span className="text-gray-600 font-medium">{userSchool}</span>
            <span className="text-gray-400">|</span>
          </>
        )}
        <span>{displayName}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* 간격 브릿지 - 버튼과 드롭다운 사이의 간격을 채워서 마우스 이동 시 메뉴가 닫히지 않도록 */}
          <div className="absolute right-0 top-full w-56 h-2" />
          
          <div
            className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          >
          {/* 사용자 정보 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">
              {userName || "사용자"}
            </p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>

          {/* 메뉴 항목 */}
          <div className="py-1">
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>프로필</span>
            </button>

            {(userRole === "admin" || userRole === "superadmin") && (
              <button
                onClick={() => {
                  router.push("/dashboard/admin/system");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>설정</span>
              </button>
            )}
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200 my-1" />

          {/* 로그아웃 */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
        </>
      )}
      
      {/* 프로필 모달 */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

