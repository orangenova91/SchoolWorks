import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import WeeklyScheduleSection from "@/components/dashboard/WeeklyScheduleSection";

const t = getTranslations("ko");

const todaysSchedule = [
  {
    title: "국어 수업",
    time: "08:30 - 09:20",
    location: "1-2 교실",
  },
  {
    title: "수학 자율 학습",
    time: "15:30 - 16:10",
    location: "도서관",
  },
];

const assignments = [
  {
    title: "역사 독후감 제출",
    due: "11월 12일 (화)",
  },
  {
    title: "수학 문제집 5단원",
    due: "11월 13일 (수)",
  },
];

const announcements = [
  {
    title: "동아리 박람회 안내",
    date: "2025-11-15",
  },
  {
    title: "모의고사 일정 안내",
    date: "2025-11-20",
  },
];

// 한국 시간대(Asia/Seoul, UTC+9) 기준으로 현재 시간을 가져오는 헬퍼 함수
const getKoreaTime = (): Date => {
  const now = new Date();
  // 한국 시간대의 날짜/시간 부분을 추출
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
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find(p => p.type === "second")?.value || "0");
  
  // 한국 시간 기준으로 ISO 문자열 생성 (UTC+9 오프셋 포함)
  // 이렇게 하면 서버의 로컬 타임존과 무관하게 올바른 UTC 시간을 얻을 수 있음
  const koreaTimeISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+09:00`;
  
  // UTC로 변환된 Date 객체 반환
  return new Date(koreaTimeISO);
};

// 한국 시간 기준으로 주간 시작(일요일 자정)을 계산하는 함수
// 한국 시간 기준의 자정을 UTC로 변환하여 반환
const getKoreaWeekStart = (): Date => {
  const now = new Date();
  
  // 한국 시간대의 현재 날짜 정보 추출
  const koreaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const koreaParts = koreaFormatter.formatToParts(now);
  const koreaYear = parseInt(koreaParts.find(p => p.type === "year")?.value || "0");
  const koreaMonth = parseInt(koreaParts.find(p => p.type === "month")?.value || "0");
  const koreaDay = parseInt(koreaParts.find(p => p.type === "day")?.value || "0");
  
  // 한국 시간 기준으로 현재 날짜 생성 (로컬 시간으로 해석)
  const koreaDate = new Date(koreaYear, koreaMonth - 1, koreaDay);
  const day = koreaDate.getDay(); // 0 (Sun) - 6 (Sat)
  const offset = day; // convert to Sunday-start (일요일 기준으로 변환)
  
  // 일요일 날짜 계산
  koreaDate.setDate(koreaDate.getDate() - offset);
  
  // 한국 시간 기준 일요일 자정(00:00:00 KST)을 UTC로 변환
  // 한국 시간(UTC+9)에서 9시간을 빼서 UTC로 변환
  const year = koreaDate.getFullYear();
  const month = koreaDate.getMonth() + 1;
  const dayOfMonth = koreaDate.getDate();
  
  // 한국 시간 기준 자정을 UTC로 변환한 Date 객체 생성
  // ISO 문자열: YYYY-MM-DDTHH:mm:ss+09:00 형식
  const koreaMidnightISO = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}T00:00:00+09:00`;
  
  // UTC로 변환된 Date 객체 반환
  return new Date(koreaMidnightISO);
};

// 한국 시간 기준으로 특정 날짜의 시작(자정)을 계산하는 함수
// baseDate: 기준이 되는 Date 객체 (UTC로 해석됨)
// daysOffset: baseDate로부터 며칠 후인지 (0이면 같은 날)
// 한국 시간 기준의 자정을 UTC로 변환하여 반환
const getKoreaDayStart = (baseDate: Date, daysOffset: number = 0): Date => {
  // baseDate를 한국 시간대로 해석하여 날짜 정보 추출
  const koreaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  // baseDate를 한국 시간대로 해석
  const koreaParts = koreaFormatter.formatToParts(baseDate);
  const koreaYear = parseInt(koreaParts.find(p => p.type === "year")?.value || "0");
  const koreaMonth = parseInt(koreaParts.find(p => p.type === "month")?.value || "0");
  const koreaDay = parseInt(koreaParts.find(p => p.type === "day")?.value || "0");
  
  // 한국 시간 기준으로 날짜 생성 (로컬 시간으로 해석)
  const koreaDate = new Date(koreaYear, koreaMonth - 1, koreaDay);
  
  // daysOffset만큼 날짜 추가
  if (daysOffset !== 0) {
    koreaDate.setDate(koreaDate.getDate() + daysOffset);
  }
  
  // 한국 시간 기준 자정(00:00:00 KST)을 UTC로 변환
  const year = koreaDate.getFullYear();
  const month = koreaDate.getMonth() + 1;
  const dayOfMonth = koreaDate.getDate();
  
  // 한국 시간 기준 자정을 UTC로 변환한 Date 객체 생성
  // ISO 문자열: YYYY-MM-DDTHH:mm:ss+09:00 형식
  const koreaMidnightISO = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}T00:00:00+09:00`;
  
  // UTC로 변환된 Date 객체 반환
  return new Date(koreaMidnightISO);
};

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  // 한국 시간대 기준으로 현재 시간 및 날짜 계산
  const now = getKoreaTime();
  const today = getKoreaTime();

  // 한국 시간 기준으로 주간 시작(일요일 자정) 계산
  const weekStart = getKoreaWeekStart();

  // 한국 시간 기준으로 주간 종료(다음 주 일요일 자정) 계산
  // weekStart는 이미 한국 시간 기준의 UTC 변환된 값이므로, 7일을 더하면 다음 주 일요일이 됨
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 학교 범위의 주간 학사일정 가져오기
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

  // 한국 시간 기준으로 오늘 날짜를 ISO 형식(YYYY-MM-DD)으로 변환
  const isoToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);

  const weeklySchedule = Array.from({ length: 7 }, (_, index) => {
    // 한국 시간 기준으로 해당 날짜의 시작(자정) 계산
    const dayStart = getKoreaDayStart(weekStart, index);
    // 다음 날 자정 계산 (하루 종료 시점)
    const dayEnd = getKoreaDayStart(weekStart, index + 1);

    // 날짜 표시용 Date 객체 (한국 시간대로 포맷팅하기 위해 사용)
    const date = new Date(dayStart);

    const eventsForDay = weeklyCalendarEvents
      .filter(
        (event) => event.startDate >= dayStart && event.startDate < dayEnd
      )
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
          {t.dashboard.studentTitle}
        </h2>
        <p className="text-gray-600">{t.dashboard.studentDescription}</p>
        <div className="mt-6 bg-green-50 border border-green-100 rounded-lg p-4 text-sm text-green-800">
          {session.user.school
            ? `${session.user.school} · ${t.dashboard.roleStudent}`
            : t.dashboard.roleStudent}
        </div>
      </header>

      <WeeklyScheduleSection schedule={weeklySchedule} todayIsoDate={isoToday} />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {t.dashboard.studentScheduleTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {todaysSchedule.length === 0 ? (
              <li className="text-sm text-gray-600">
                {t.dashboard.studentScheduleEmpty}
              </li>
            ) : (
              todaysSchedule.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col rounded-lg border border-gray-100 p-4"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {item.title}
                  </span>
                  <span className="text-sm text-gray-600 mt-1">{item.time}</span>
                  <span className="text-xs text-gray-500 mt-1">
                    {item.location}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            {t.dashboard.studentAssignmentsTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {assignments.length === 0 ? (
              <li className="text-sm text-gray-600">
                {t.dashboard.studentAssignmentsEmpty}
              </li>
            ) : (
              assignments.map((assignment) => (
                <li
                  key={assignment.title}
                  className="rounded-lg border border-gray-100 p-4"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {assignment.title}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {assignment.due}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          {t.dashboard.studentAnnouncementsTitle}
        </h3>
        <ul className="mt-4 space-y-3">
          {announcements.map((announcement) => (
            <li
              key={announcement.title}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
            >
              <span className="text-sm font-medium text-gray-900">
                {announcement.title}
              </span>
              <span className="text-xs text-gray-500">{announcement.date}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

