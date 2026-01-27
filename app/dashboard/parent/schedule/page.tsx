import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n";
import TeacherScheduleClient from "@/components/dashboard/TeacherScheduleClient";

export default async function ParentSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "parent") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");

  // 오늘부터 3개월 전후 학교 학사 일정 가져오기 (학생 화면과 동일한 범위/형식)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 31);

  const events = (await prisma.calendarEvent.findMany({
    where: {
      scope: "school",
      school: session.user.school || undefined,
      startDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { startDate: "asc" },
  })) as Array<{
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

  const formattedEvents = events.map(
    (event: {
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
    }) => ({
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      start: event.startDate.toISOString(),
      end: event.endDate ? event.endDate.toISOString() : null,
      allDay:
        !event.endDate ||
        event.startDate.toDateString() === event.endDate.toDateString(),
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
    })
  );

  return (
    <div className="space-y-6">
      <TeacherScheduleClient
        initialEvents={formattedEvents}
        title={t.dashboard.teacherScheduleTitle}
        description="학교 학사 일정을 확인할 수 있습니다."
        allowedScheduleAreas={["개인일정(나만 보기)"]}
        editableScopes={["personal"]}
        showAddButton={false}
      />
    </div>
  );
}












