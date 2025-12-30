import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import WeeklyScheduleSection from "@/components/dashboard/WeeklyScheduleSection";
import Link from "next/link";
import { Bell, Calendar, FileText, User } from "lucide-react";

const t = getTranslations("ko");

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

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "parent") {
    redirect("/dashboard");
  }

  const now = getKoreaTime();
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

  const parentAnnouncements = await prisma.announcement.findMany({
    where: {
      OR: [{ audience: "parents" }, { audience: "all" }],
      school: session.user.school || undefined,
      OR: [
        { publishedAt: { lte: new Date() } },
        { isScheduled: false, publishedAt: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
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
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요 {session.user.name ?? "학부모"}님, 환영합니다
        </h2>
        <p className="text-gray-600">자녀의 학교 생활을 한눈에 확인하세요.</p>
        <div className="mt-6 bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-purple-800">
          {session.user.school
            ? `${session.user.school} · 학부모`
            : "학부모"}
        </div>
      </header>

      <WeeklyScheduleSection schedule={weeklySchedule} todayIsoDate={isoToday} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              최근 공지사항
            </h3>
            <Link
              href="/dashboard/parent/announcements"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              전체 보기 →
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {parentAnnouncements.length === 0 ? (
              <li className="text-sm text-gray-600">공지사항이 없습니다.</li>
            ) : (
              parentAnnouncements.map((announcement) => (
                <li
                  key={announcement.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 block">
                      {announcement.title}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {announcement.author} ·{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        timeZone: "Asia/Seoul",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(announcement.createdAt))}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            자녀 정보
          </h3>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              자녀 정보 연결 기능은 준비 중입니다.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              자녀의 학생 계정과 연결하면 출석, 과제, 성적 정보를 확인할 수 있습니다.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/parent/announcements"
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">공지사항</h3>
          </div>
          <p className="text-sm text-gray-600">학교 공지사항을 확인하세요</p>
        </Link>

        <Link
          href="/dashboard/parent/schedule"
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">학사일정</h3>
          </div>
          <p className="text-sm text-gray-600">학교 일정을 확인하세요</p>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">자녀 학습</h3>
          </div>
          <p className="text-sm text-gray-600">
            자녀 연결 후 이용 가능합니다
          </p>
        </div>
      </section>
    </div>
  );
}











