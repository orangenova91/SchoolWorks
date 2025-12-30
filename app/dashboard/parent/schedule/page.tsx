import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import WeeklyScheduleSection from "@/components/dashboard/WeeklyScheduleSection";
import { prisma } from "@/lib/prisma";

const getKoreaTime = (): Date => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "0");
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find((p) => p.type === "second")?.value || "0");

  const koreaTimeISO = `${year}-${String(month).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}:${String(second).padStart(2, "0")}+09:00`;

  return new Date(koreaTimeISO);
};

const getKoreaWeekStart = (): Date => {
  const now = new Date();
  const koreaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const koreaParts = koreaFormatter.formatToParts(now);
  const koreaYear = parseInt(
    koreaParts.find((p) => p.type === "year")?.value || "0"
  );
  const koreaMonth = parseInt(
    koreaParts.find((p) => p.type === "month")?.value || "0"
  );
  const koreaDay = parseInt(
    koreaParts.find((p) => p.type === "day")?.value || "0"
  );

  const koreaDate = new Date(koreaYear, koreaMonth - 1, koreaDay);
  const day = koreaDate.getDay();
  const offset = day;

  koreaDate.setDate(koreaDate.getDate() - offset);

  const year = koreaDate.getFullYear();
  const month = koreaDate.getMonth() + 1;
  const dayOfMonth = koreaDate.getDate();

  const koreaMidnightISO = `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(dayOfMonth).padStart(2, "0")}T00:00:00+09:00`;

  return new Date(koreaMidnightISO);
};

const getKoreaDayStart = (baseDate: Date, daysOffset: number = 0): Date => {
  const koreaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const koreaParts = koreaFormatter.formatToParts(baseDate);
  const koreaYear = parseInt(
    koreaParts.find((p) => p.type === "year")?.value || "0"
  );
  const koreaMonth = parseInt(
    koreaParts.find((p) => p.type === "month")?.value || "0"
  );
  const koreaDay = parseInt(
    koreaParts.find((p) => p.type === "day")?.value || "0"
  );

  const koreaDate = new Date(koreaYear, koreaMonth - 1, koreaDay);

  if (daysOffset !== 0) {
    koreaDate.setDate(koreaDate.getDate() + daysOffset);
  }

  const year = koreaDate.getFullYear();
  const month = koreaDate.getMonth() + 1;
  const dayOfMonth = koreaDate.getDate();

  const koreaMidnightISO = `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(dayOfMonth).padStart(2, "0")}T00:00:00+09:00`;

  return new Date(koreaMidnightISO);
};

export default async function ParentSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "parent") {
    redirect("/dashboard");
  }

  const today = getKoreaTime();
  const weekStart = getKoreaWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const weeklyCalendarEvents = await prisma.calendarEvent.findMany({
    where: {
      scope: "school",
      school: session.user.school || undefined,
      startDate: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    orderBy: { startDate: "asc" },
  });

  const dayFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isoToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);

  const weeklySchedule = Array.from({ length: 7 }, (_, index) => {
    const dayStart = getKoreaDayStart(weekStart, index);
    const dayEnd = getKoreaDayStart(weekStart, index + 1);
    const date = new Date(dayStart);

    const eventsForDay = weeklyCalendarEvents
      .filter((event) => event.startDate >= dayStart && event.startDate < dayEnd)
      .map((event) => ({
        id: event.id,
        title: event.title,
        displayTime: timeFormatter.format(event.startDate),
        eventType: event.eventType,
        department: event.department ?? undefined,
        description: event.description ?? "",
        startDateISO: event.startDate.toISOString(),
        endDateISO: event.endDate ? event.endDate.toISOString() : null,
        scope: event.scope,
        responsiblePerson: event.responsiblePerson ?? undefined,
        dateLabel: dayFormatter.format(date),
      }));

    return {
      dateLabel: dayFormatter.format(date),
      isoDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date),
      events: eventsForDay,
    };
  });

  return (
    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">학사일정</h1>
        <p className="mt-2 text-sm text-gray-600">학교 일정을 확인하세요.</p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <WeeklyScheduleSection schedule={weeklySchedule} todayIsoDate={isoToday} />
      </section>
    </div>
  );
}











