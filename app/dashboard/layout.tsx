import { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import UserMenu from "@/components/dashboard/UserMenu";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Footer } from "@/components/dashboard/Footer";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import CurrentPageNav from "@/components/dashboard/CurrentPageNav";
import {
  Home,
  Calendar,
  BookOpen,
  BookOpenCheck,
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
  Clipboard,
  ClipboardMinus,
  ClipboardCopy,
  ClipboardList,
  MessageSquare,
  GraduationCap,
  Sparkles,
  PartyPopper,
} from "lucide-react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
  const prismaAny = prisma as any;

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

  const currentUser = await prismaAny.user.findUnique({
    where: { id: session.user.id },
    select: {
      school: true,
      studentProfile: { select: { school: true } },
      teacherProfile: { select: { school: true } },
      parentProfile: { select: { studentIds: true } },
    },
  });

  let schoolName: string | null =
    currentUser?.school ??
    currentUser?.studentProfile?.school ??
    currentUser?.teacherProfile?.school ??
    session.user.school ??
    null;

  if (!schoolName && role === "parent") {
    const studentId = currentUser?.parentProfile?.studentIds?.[0];
    if (studentId) {
      const student = await prismaAny.user.findUnique({
        where: { id: studentId },
        select: {
          school: true,
          studentProfile: { select: { school: true } },
        },
      });
      schoolName = student?.school ?? student?.studentProfile?.school ?? null;
    }
  }

  let schoolLogoUrl: string | null = null;
  const normalizedSchoolName = schoolName?.trim() || null;
  if (normalizedSchoolName) {
    const schools =
      role === "admin"
        ? await prismaAny.school.findMany({
            where: {
              OR: [
                { adminUserId: session.user.id },
                { name: normalizedSchoolName },
              ],
            },
            select: { logoUrl: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
          })
        : await prismaAny.school.findMany({
            where: { name: normalizedSchoolName },
            select: { logoUrl: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
          });

    const withLogo = schools.find(
      (item: { logoUrl?: string | null }) => Boolean(item?.logoUrl)
    );

    schoolLogoUrl = withLogo?.logoUrl ?? schools[0]?.logoUrl ?? null;
  }

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
            href: "/dashboard/teacher/academic-preparation",
            label: "학사 준비",
            icon: <GraduationCap className="w-5 h-5" />,
            iconName: "GraduationCap"
          },
          {
            href: "/dashboard/teacher/schedule",
            label: t.sidebar.teacher.schedule,
            icon: <Calendar className="w-5 h-5" />,
            iconName: "Calendar",
            dividerBefore: true
          },
          {
            href: "/dashboard/teacher/manage-classes",
            label: t.sidebar.teacher.manageClasses,
            icon: <BookOpen className="w-5 h-5" />,
            iconName: "BookOpen"
          },
          {
            href: "/dashboard/teacher/after-school",
            label: "방과후 수업",
            icon: <BookOpenCheck className="w-5 h-5" />,
            iconName: "BookOpenCheck"
          },
          {
            href: "/dashboard/teacher/class-management",
            label: t.sidebar.teacher.classManagement,
            icon: <Users className="w-5 h-5" />,
            iconName: "Users"
          },
          {
            href: "/dashboard/teacher/club",
            label: "동아리",
            icon: <PartyPopper className="w-5 h-5" />,
            iconName: "PartyPopper"
          },

          {
            href: "/dashboard/teacher/evaluation",
            label: "진도 및 평가",
            icon: <TrendingUp className="w-5 h-5" />,
            iconName: "ClipboardList"
          },
          {
            href: "/dashboard/teacher/students",
            label: "구성원 조회",
            icon: <UserCheck className="w-5 h-5" />,
            iconName: "UserCheck"
          },
          {
            href: "/dashboard/teacher/board_teachers",
            label: "교직원 게시판",
            icon: <Clipboard className="w-5 h-5" />,
            iconName: "Clipboard",
            dividerBefore: true
          },
          {
            href: "/dashboard/teacher/board_students",
            label: "학생 게시판",
            icon: <ClipboardMinus className="w-5 h-5" />,
            iconName: "ClipboardMinus"
          },
          {
            href: "/dashboard/teacher/board_parents",
            label: "가정 안내문",
            icon: <ClipboardCopy className="w-5 h-5" />,
            iconName: "ClipboardCopy"
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            dividerBefore: true,
            external: isGoogleWorkspaceUser,
          },
          {
            href: "/dashboard/teacher/developer-contact",
            label: "기능제안 및 버그신고",
            icon: <MessageSquare className="w-5 h-5" />,
            iconName: "MessageSquare",
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
            href: "/dashboard/student/schedule?tab=academic",
            label: t.sidebar.student.todaysSchedule,
            icon: <Calendar className="w-5 h-5" />,
            iconName: "Calendar",
            dividerBefore: true
          },
          {
            href: "/dashboard/student/schedule?tab=creative",
            label: "창의적 체험활동",
            icon: <Sparkles className="w-5 h-5" />,
            iconName: "Sparkles",
          },
          {
            href: "/dashboard/student/club",
            label: "동아리",
            icon: <PartyPopper className="w-5 h-5" />,
            iconName: "PartyPopper",
          },
          {
            href: "/dashboard/student/classroom",
            label: t.sidebar.student.classroom,
            icon: <BookOpen className="w-5 h-5" />,
            iconName: "BookOpen"
          },
          {
            href: "/dashboard/student/after-school",
            label: "방과후 수업",
            icon: <BookOpenCheck className="w-5 h-5" />,
            iconName: "BookOpenCheck"
          },
          {
            href: "/dashboard/student/assignments",
            label: t.sidebar.student.assignments,
            icon: <FileText className="w-5 h-5" />,
            iconName: "FileText"
          },
          {
            href: "/dashboard/student/announcements",
            label: "학생 게시판",
            icon: <ClipboardMinus className="w-5 h-5" />,
            iconName: "ClipboardMinus",
            dividerBefore: true
          },
          {
            href: "/dashboard/student/family-notices",
            label: "가정 안내문",
            icon: <ClipboardCopy className="w-5 h-5" />,
            iconName: "ClipboardCopy"
          },
          {
            href: "/dashboard/student/support",
            label: t.sidebar.student.support,
            icon: <HelpCircle className="w-5 h-5" />,
            iconName: "HelpCircle",
            dividerBefore: true
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
            href: "/dashboard/parent/schedule",
            label: "학사일정",
            icon: <Calendar className="w-5 h-5" />,
            iconName: "Calendar",
            dividerBefore: true,
          },
          {
            href: "/dashboard/parent/announcements",
            label: "가정 안내문",
            icon: <ClipboardCopy className="w-5 h-5" />,
            iconName: "ClipboardCopy",
          },
          {
            href: googleChatLink,
            label: isGoogleWorkspaceUser ? "Google Chat" : "메시지",
            icon: <MessageCircle className="w-5 h-5" />,
            iconName: "MessageCircle",
            dividerBefore: true,
            external: isGoogleWorkspaceUser,
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col relative overflow-x-hidden">
      <div className="print:hidden">
        <AnimatedBackground />
      </div>
      <nav className="bg-white/80 backdrop-blur-lg shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-white/20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {schoolLogoUrl && (
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-blue-100 overflow-hidden">
                  <img
                    src={schoolLogoUrl}
                    alt={normalizedSchoolName ? `${normalizedSchoolName} 로고` : "학교 로고"}
                    className="w-full h-full object-cover"
                  />
                </span>
              )}
              <h1 className="text-xl font-bold text-gray-900">
                <Link href="/dashboard" className="hover:text-blue-700 transition-colors">
                  SchoolWorks
                </Link>
                <span className="text-sm font-normal"> {t.app.version}</span>
              </h1>
              <CurrentPageNav items={navItems} />
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu
                userName={session.user?.name || ""}
                userEmail={session.user?.email || ""}
                userRole={session.user?.role || ""}
                userStudentId={session.user?.studentId || null}
                userStudentIds={session.user?.studentIds || null}
                schoolName={normalizedSchoolName}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="print:hidden">
        <Sidebar
          items={navItems}
          schoolName={normalizedSchoolName}
          schoolLogoUrl={schoolLogoUrl}
        />
      </div>
      <main className="ml-16 xl:ml-20 pt-20 pb-10 px-4 sm:px-8 lg:px-10 flex-1 transition-all duration-300 relative z-10 print:ml-0 print:pt-0">
        <div className="max-w-7xl mx-auto">
          <section className="w-full">{children}</section>
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

