import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import UserMenu from "@/components/dashboard/UserMenu";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Footer } from "@/components/dashboard/Footer";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import CurrentPageNav from "@/components/dashboard/CurrentPageNav";
import {
  Home,
  Calendar,
  BookOpen,
  FileText,
  Folder,
  BarChart,
  Users,
  Settings,
  TrendingUp,
  Bell,
  HelpCircle,
  Shield,
  User,
  MessageCircle,
  UserCheck,
  Newspaper,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const t = getTranslations("ko");
  const role = session.user.role;

  // Google Workspace 도메인 확인 (여러 도메인 지원: 쉼표로 구분)
  const googleWorkspaceDomains = (process.env.GOOGLE_WORKSPACE_DOMAIN || "")
    .split(",")
    .map(domain => domain.trim())
    .filter(domain => domain.length > 0);

  const isGoogleWorkspaceUser = Boolean(
    googleWorkspaceDomains.length > 0 &&
    session.user.email &&
    googleWorkspaceDomains.some(domain => 
      session.user.email!.endsWith(`@${domain}`)
    )
  );
  
  // Google Chat 링크 생성
  const googleChatLink = isGoogleWorkspaceUser 
    ? "https://chat.google.com"
    : "/dashboard/chat"; // 일반 사용자는 나중에 다른 채팅 솔루션으로 대체 가능

  const navItems =
    role === "teacher"
      ? [
          { 
            href: "/dashboard/teacher", 
            label: t.sidebar.teacher.overview,
            icon: <Home className="w-5 h-5" />,
            iconName: "Home"
          },
          {
            href: "/dashboard/teacher/schedule",
            label: t.sidebar.teacher.schedule,
            icon: <Calendar className="w-5 h-5" />,
            iconName: "Calendar"
          },
          {
            href: "/dashboard/teacher/staff-announcements",
            label: "교직원 게시판",
            icon: <FileText className="w-5 h-5" />,
            iconName: "FileText"
          },
          {
            href: "/dashboard/teacher/manage-classes",
            label: t.sidebar.teacher.manageClasses,
            icon: <BookOpen className="w-5 h-5" />,
            iconName: "BookOpen"
          },
          {
            href: "/dashboard/teacher/class-management",
            label: t.sidebar.teacher.classManagement,
            icon: <Users className="w-5 h-5" />,
            iconName: "Users"
          },
          {
            href: "/dashboard/teacher/student-progress",
            label: t.sidebar.teacher.studentProgress,
            icon: <TrendingUp className="w-5 h-5" />,
            iconName: "TrendingUp"
          },
          {
            href: "/dashboard/teacher/announcements",
            label: t.sidebar.teacher.announcements,
            icon: <Newspaper className="w-5 h-5" />,
            iconName: "Newspaper"
          },
          {
            href: "/dashboard/teacher/students",
            label: "구성원 조회",
            icon: <UserCheck className="w-5 h-5" />,
            iconName: "UserCheck"
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            external: isGoogleWorkspaceUser,
          },
        ]
      : role === "student"
      ? [
          { 
            href: "/dashboard/student", 
            label: t.sidebar.student.overview,
            icon: <Home className="w-5 h-5" />,
            iconName: "Home"
          },
          {
            href: "/dashboard/student/schedule",
            label: t.sidebar.student.todaysSchedule,
            icon: <Calendar className="w-5 h-5" />,
            iconName: "Calendar"
          },
          {
            href: "/dashboard/student/classroom",
            label: t.sidebar.student.classroom,
            icon: <BookOpen className="w-5 h-5" />,
            iconName: "BookOpen"
          },
          {
            href: "/dashboard/student/assignments",
            label: t.sidebar.student.assignments,
            icon: <FileText className="w-5 h-5" />,
            iconName: "FileText"
          },
          {
            href: "/dashboard/student/announcements",
            label: t.sidebar.student.announcements,
            icon: <Bell className="w-5 h-5" />,
            iconName: "Bell"
          },
          {
            href: "/dashboard/student/support",
            label: t.sidebar.student.support,
            icon: <HelpCircle className="w-5 h-5" />,
            iconName: "HelpCircle"
          },
          {
            href: "/dashboard/student/profile",
            label: "프로필 수정",
            icon: <User className="w-5 h-5" />,
            iconName: "User"
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            external: isGoogleWorkspaceUser,
          },
        ]
      : role === "admin"
      ? [
          {
            href: "/dashboard/admin/overview",
            label: "운영 현황",
            icon: <Shield className="w-5 h-5" />,
            iconName: "Shield"
          },
          {
            href: "/dashboard/admin/users",
            label: "사용자 관리",
            icon: <Users className="w-5 h-5" />,
            iconName: "Users"
          },
          {
            href: "/dashboard/admin/content",
            label: "콘텐츠·공지",
            icon: <Folder className="w-5 h-5" />,
            iconName: "Folder"
          },
          {
            href: "/dashboard/admin/alerts",
            label: "알림 센터",
            icon: <Bell className="w-5 h-5" />,
            iconName: "Bell"
          },
          {
            href: "/dashboard/admin/reports",
            label: "리포트",
            icon: <BarChart className="w-5 h-5" />,
            iconName: "BarChart"
          },
          {
            href: "/dashboard/admin/system",
            label: "시스템 설정",
            icon: <Settings className="w-5 h-5" />,
            iconName: "Settings"
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            external: isGoogleWorkspaceUser,
          },
        ]
      : role === "superadmin"
      ? [
          {
            href: "/dashboard/superadmin",
            label: "슈퍼어드민 대시보드",
            icon: <Shield className="w-5 h-5" />,
            iconName: "Shield"
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            external: isGoogleWorkspaceUser,
          },
        ]
      : role === "parent"
      ? [
          {
            href: "/dashboard/parent",
            label: "대시보드",
            icon: <Home className="w-5 h-5" />,
            iconName: "Home",
          },
          {
            href: "/dashboard/parent/announcements",
            label: "공지사항",
            icon: <Bell className="w-5 h-5" />,
            iconName: "Bell",
          },
          {
            href: "/dashboard/parent/schedule",
            label: "학사일정",
            icon: <Calendar className="w-5 h-5" />,
            iconName: "Calendar",
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            external: isGoogleWorkspaceUser,
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col relative overflow-hidden">
      <AnimatedBackground />
      <nav className="bg-white/80 backdrop-blur-lg shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">SchoolHub<span className="text-sm font-normal"> {t.app.version}</span></h1>
              <CurrentPageNav items={navItems} />
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu
                userName={session.user?.name || ""}
                userEmail={session.user?.email || ""}
                userRole={session.user?.role || ""}
                schoolName={session.user?.school || null}
              />
            </div>
          </div>
        </div>
      </nav>

      <Sidebar items={navItems} />
      <main className="ml-16 xl:ml-20 pt-20 pb-10 px-4 sm:px-8 lg:px-10 flex-1 transition-all duration-300 relative z-10">
        <div className="max-w-7xl mx-auto">
          <section className="w-full">{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

