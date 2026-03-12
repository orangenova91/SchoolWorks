import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import StudentScheduleClient from "@/components/dashboard/StudentScheduleClient";

export default async function StudentSchedulePage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");

  // 오늘부터 3개월 전후 학교 학사 일정 가져오기
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 31);

  const events = await prisma.calendarEvent.findMany({
    where: {
      scope: "school",
      school: session.user.school || undefined,
      startDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { startDate: "asc" },
  });

  // FullCalendar는 end를 exclusive로 사용하므로, 사용자 선택 종료일(inclusive)을 다음날 00:00으로 넘김
  const toExclusiveEnd = (d: Date): string =>
    new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
    ).toISOString();

  const formattedEvents = events.map((event: any) => ({
    id: event.id,
    title: event.title,
    description: event.description || undefined,
    start: event.startDate.toISOString(),
    end: event.endDate ? toExclusiveEnd(event.endDate) : null,
    // 학생 학사 일정은 모두 종일 이벤트로 취급하여 "오전 12시"와 같은 시간 표시를 숨김
    allDay: true,
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

  const initialTab =
    searchParams?.tab === "creative" ? "creative" : "academic";

  return (
    <div className="space-y-6">
      <StudentScheduleClient
        title={t.dashboard.teacherScheduleTitle}
        description="학교 학사 일정과 창의적 체험활동 일정을 확인할 수 있습니다."
        initialEvents={formattedEvents}
        initialTab={initialTab}
      />
    </div>
  );
}