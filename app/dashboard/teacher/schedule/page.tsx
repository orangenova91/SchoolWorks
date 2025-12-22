import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import TeacherScheduleClient from "@/components/dashboard/TeacherScheduleClient";

export default async function TeacherSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");

  // 오늘부터 3개월 전후 일정 가져오기
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 31);

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        // 같은 학교의 모든 학교 일정
        { 
          scope: "school", 
          school: session.user.school || undefined,
        },
        // 개인 일정 (교사 본인만)
        { scope: "personal", teacherId: session.user.id },
      ],
      startDate: {
        gte: startDate,
        lte: endDate,
      },
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
  }>;

  // FullCalendar 형식으로 변환
  const formattedEvents = events.map((event: {
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
  }) => ({
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
    },
  }));

  return (
    <div className="space-y-6">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.teacherScheduleTitle}</h1>
          <p className="mt-2 text-sm text-gray-600">
            학교 운영(창의적 체험활동 포함) 및 개인 일정을 확인하고 관리할 수 있습니다.
          </p>
        </header>
      </div>

      <TeacherScheduleClient initialEvents={formattedEvents} />
    </div>
  );
}

