import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import CourseTabs from "@/components/dashboard/CourseTabs";
import dynamic from "next/dynamic";

const SupervisionMealCalendar = dynamic(
  () => import("@/components/dashboard/SupervisionMealCalendar"),
  { ssr: false, loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div> }
);

const CleaningAreaClient = dynamic(() => import("@/components/dashboard/CleaningArea"), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div>,
});

const VolunteerClient = dynamic(() => import("@/components/dashboard/Volunteer"), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div>,
});

const ClubClient = dynamic(() => import("@/components/dashboard/Club"), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div>,
});

const OrganizationRolesClient = dynamic(() => import("@/components/dashboard/OrganizationRoles"), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div>,
});

const AnnouncementPageClient = dynamic(
  () => import("../announcements/AnnouncementPageClient").then((mod) => mod.AnnouncementPageClient),
  { ssr: false, loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div> }
);

export default async function AcademicPreparationPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}) {
  const params =
    searchParams && typeof (searchParams as Promise<{ tab?: string }>).then === "function"
      ? await searchParams
      : (searchParams ?? {});
  const tab = (params as { tab?: string })?.tab;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "teacher") redirect("/dashboard");

  const t = getTranslations("ko");

  // 학사일정 달력용: 오늘 기준 3개월 전후 일정
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 31);

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { scope: "school", school: session.user.school || undefined },
        { scope: "personal", teacherId: session.user.id },
      ],
      startDate: { gte: startDate, lte: endDate },
    },
    orderBy: { startDate: "asc" },
  }) as Array<{
    id: string;
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    eventType: string | null;
    scope: string;
    school: string | null;
    courseId: string | null;
    department: string | null;
    responsiblePerson: string | null;
    scheduleArea: string | null;
    gradeLevels: string[];
    periods: string[];
  }>;

  const formattedEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description || undefined,
    start: event.startDate.toISOString(),
    end: event.endDate ? event.endDate.toISOString() : null,
    allDay: !event.endDate || event.startDate.toDateString() === event.endDate.toDateString(),
    extendedProps: {
      eventType: event.eventType,
      scope: event.scope,
      school: event.school || undefined,
      courseId: event.courseId || undefined,
      department: event.department || undefined,
      responsiblePerson: event.responsiblePerson || undefined,
      scheduleArea: event.scheduleArea || undefined,
      gradeLevels: event.gradeLevels || [],
      periods: event.periods || [],
    },
  }));

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">학사 준비</h1>
        </div>
        <p className="text-sm text-gray-600 mt-1">학사 준비를 위한 페이지입니다.</p>
      </header>

      <section>
        <CourseTabs
          initialTabId={tab === "supervision-meal" ? "supervision-meal" : undefined}
          tabs={[
            { id: "work-guide", label: "업무 안내" },
            { id: "supervision-meal", label: "급식지도/야자감독" },
            { id: "cleaning-area", label: "청소구역" },
            { id: "volunteer", label: "봉사활동" },
            { id: "club", label: "동아리" },
            { id: "organization", label: "학급 및 학생회 조직" },
            { id: "awards", label: "수상(교내 시상 계획)" },
          ]}
        >
          {[
            <article key="work-guide" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <AnnouncementPageClient
                title="업무 안내"
                description="교직원 업무 안내 사항을 작성하고 확인하세요."
                authorName={session.user.name || session.user.email || "담당 교사"}
                includeScheduled={true}
                audience="teacher"
                boardType="board_work_guide"
              />
            </article>,

            <article key="supervision-meal" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <SupervisionMealCalendar
                initialEvents={formattedEvents}
                title={t.dashboard.teacherScheduleTitle}
                description="급식지도/야자감독 일정을 학사일정 달력에서 확인할 수 있습니다."
                currentTeacherName={session.user.name ?? undefined}
                currentTeacherEmail={session.user.email ?? undefined}
              />
            </article>,

            <article key="cleaning-area" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <CleaningAreaClient />
            </article>,

            <article key="volunteer" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <VolunteerClient />
            </article>,

            <article key="club" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <ClubClient />
            </article>,

            <article key="organization" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <OrganizationRolesClient />
            </article>,

            <article key="awards" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">수상(교내 시상 계획)</h2>
              <div className="text-center py-12">
                <p className="text-gray-500">내용이 준비 중입니다.</p>
              </div>
            </article>,

            
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}

