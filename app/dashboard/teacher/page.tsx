import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import WeeklyScheduleSection from "@/components/dashboard/WeeklyScheduleSection";
import BannerSection from "@/components/dashboard/teacher/BannerSection";
import CollaborativeDocLinksSection from "@/components/dashboard/teacher/CollaborativeDocLinksSection";
import { Calendar, Users, UserCheck, MessageSquare, Paperclip } from "lucide-react";

const t = getTranslations("ko");

const teacherSections = [
  {
    key: "manageClasses",
    title: t.dashboard.teacherSections.manageClasses.title,
    description: t.dashboard.teacherSections.manageClasses.description,
    action: t.dashboard.teacherSections.manageClasses.action,
  },
  {
    key: "studentProgress",
    title: t.dashboard.teacherSections.studentProgress.title,
    description: t.dashboard.teacherSections.studentProgress.description,
    action: t.dashboard.teacherSections.studentProgress.action,
  },
  {
    key: "announcements",
    title: t.dashboard.teacherSections.announcements.title,
    description: t.dashboard.teacherSections.announcements.description,
    action: t.dashboard.teacherSections.announcements.action,
  },
];

const upcomingLessons = [
  {
    title: "2학년 과학 실험 수업",
    time: "11월 11일 (월) 09:00",
    location: "과학실 2",
  },
  {
    title: "3학년 진로 상담",
    time: "11월 12일 (화) 13:30",
    location: "상담실",
  },
];

const quickNotes = [
  {
    title: "1학년 기말고사 공지",
    date: "2025-11-15",
  },
  {
    title: "교원 협의회",
    date: "2025-11-18",
  },
];

type ClassGroupSchedule = {
  day: string;
  period: string;
};

type ClassGroupSummary = {
  id: string;
  name: string;
  period: string | null;
  schedules: string;
  studentIds: string[];
};

type TeacherCourse = {
  id: string;
  academicYear: string;
  semester: string;
  subjectGroup: string;
  subjectArea: string;
  careerTrack: string;
  subject: string;
  grade: string;
  instructor: string;
  classroom: string;
  description: string;
  joinCode: string | null;
  createdAt: Date;
  classGroups: ClassGroupSummary[];
};

type TeacherCourseWithTodayGroups = TeacherCourse & {
  todayGroups: ClassGroupSummary[];
};

const formatGrade = (grade: string) => {
  switch (grade) {
    case "1":
      return "1학년";
    case "2":
      return "2학년";
    case "3":
      return "3학년";
    default:
      return grade;
  }
};

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

// 한국 시간 기준으로 특정 날짜의 자정(00:00:00)을 가져오는 함수
const getKoreaMidnight = (date: Date): Date => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  
  // 한국 시간 기준으로 ISO 문자열 생성 (UTC+9 오프셋 포함)
  // 이렇게 하면 서버의 로컬 타임존과 무관하게 올바른 UTC 시간을 얻을 수 있음
  const koreaMidnightISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+09:00`;
  
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

// 한국 시간대 기준으로 요일을 가져오는 함수
const getDayOfWeek = (date: Date): string => {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  // 한국 시간대 기준으로 요일 계산
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  const weekday = formatter.format(date);
  // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"을 인덱스로 변환
  const weekdayMap: Record<string, number> = {
    "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
  };
  return days[weekdayMap[weekday] || 0];
};

const parseSchedules = (value: string): ClassGroupSchedule[] => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (schedule): schedule is ClassGroupSchedule =>
          typeof schedule?.day === "string" && typeof schedule?.period === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
};

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const teacherId = session.user.id;
  // 한국 시간대 기준으로 현재 시간 및 날짜 계산
  const now = getKoreaTime();
  const today = getKoreaTime();
  const todayDay = getDayOfWeek(today);

  // 한국 시간 기준으로 주간 시작(일요일 자정) 계산
  const weekStart = getKoreaWeekStart();

  // 한국 시간 기준으로 주간 종료(다음 주 일요일 자정) 계산
  // weekStart는 이미 한국 시간 기준의 UTC 변환된 값이므로, 7일을 더하면 다음 주 일요일이 됨
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const school = session.user.school;

  const [weeklyCalendarEvents, supervisionMealSchedules] = await Promise.all([
    prisma.calendarEvent.findMany({
    where: {
      AND: [
        {
          OR: [
            { scope: "school", school: session.user.school || undefined },
            { scope: "personal", teacherId: session.user.id },
          ],
        },
        {
          // 이벤트가 주간 범위와 겹치는 경우를 모두 포함
          OR: [
            // 시작일이 주간 범위 내에 있는 경우
            {
              startDate: {
                gte: weekStart,
                lt: weekEnd,
              },
            },
            // 종료일이 주간 범위 내에 있는 경우
            {
              endDate: {
                gte: weekStart,
                lt: weekEnd,
              },
            },
            // 시작일이 주간 범위 이전이고 종료일이 주간 범위 이후인 경우 (주간을 완전히 포함하는 긴 이벤트)
            {
              startDate: {
                lt: weekStart,
              },
              endDate: {
                gte: weekEnd,
              },
            },
            // 시작일이 주간 범위 이전이고 종료일이 없거나 주간 범위 이후인 경우
            {
              startDate: {
                lt: weekStart,
              },
              OR: [
                { endDate: null },
                { endDate: { gte: weekStart } },
              ],
            },
          ],
        },
      ],
    },
    orderBy: { startDate: "asc" },
  }),
    school
      ? (prisma as any).supervisionMealSchedule.findMany({
          where: {
            school,
            date: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const classes: TeacherCourse[] = teacherId
    ? await (
        prisma as unknown as {
          course: {
            findMany: (args: {
              where: { teacherId: string };
              orderBy: { createdAt: "desc" };
              include: { classGroups: true };
            }) => Promise<TeacherCourse[]>;
          };
        }
      ).course.findMany({
        where: { teacherId },
        orderBy: { createdAt: "desc" },
        include: { classGroups: true },
      })
    : [];

  const todaysClasses: TeacherCourseWithTodayGroups[] = classes
    .map((course) => {
      const todayGroups = course.classGroups.filter((group) => {
        const schedules = parseSchedules(group.schedules);
        return schedules.some((schedule) => schedule.day === todayDay);
      });
      return { ...course, todayGroups };
    })
    .filter((course) => course.todayGroups.length > 0);

  const todaysGroupCount = todaysClasses.reduce(
    (total, course) => total + course.todayGroups.length,
    0
  );

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

  const toIsoDate = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const supervisionMealMap: Record<
    string,
    { eveningSupervision: string[]; mealGuidance: string[] }
  > = {};
  (supervisionMealSchedules || []).forEach((s: any) => {
    const key = s.date ? toIsoDate(new Date(s.date)) : "";
    if (!key) return;
    const ev = Array.isArray(s.eveningSupervision) ? s.eveningSupervision.filter((x: any) => typeof x === "string") : [];
    const mg = Array.isArray(s.mealGuidance) ? s.mealGuidance.filter((x: any) => typeof x === "string") : [];
    if (ev.length > 0 || mg.length > 0) {
      supervisionMealMap[key] = {
        eveningSupervision: ev,
        mealGuidance: mg,
      };
    }
  });

  const weeklySchedule = Array.from({ length: 7 }, (_, index) => {
    // 한국 시간 기준으로 해당 날짜의 시작(자정) 계산
    const dayStart = getKoreaDayStart(weekStart, index);
    // 다음 날 자정 계산 (하루 종료 시점)
    const dayEnd = getKoreaDayStart(weekStart, index + 1);

    // 날짜 표시용 Date 객체 (한국 시간대로 포맷팅하기 위해 사용)
    const date = new Date(dayStart);
    const isoDateStr = toIsoDate(date);

    const eventsForDay = weeklyCalendarEvents
      .filter((event) => {
        // 이벤트의 종료일이 없으면 시작일을 종료일로 사용
        const eventEnd = event.endDate || event.startDate;
        // 이벤트가 해당 날짜와 겹치는지 확인:
        // - 이벤트 시작일이 해당 날짜 종료 전이고
        // - 이벤트 종료일이 해당 날짜 시작 이후
        return event.startDate < dayEnd && eventEnd >= dayStart;
      })
      .map((event) => ({
        id: event.id,
        title: event.title,
        displayTime: timeFormatter.format(event.startDate),
        eventType: event.eventType,
        department: event.department ?? undefined,
        description: event.description ?? "",
        gradeLevels: (event as any).gradeLevels ?? undefined,
        periods: (event as any).periods ?? undefined,
        startDateISO: event.startDate.toISOString(),
        endDateISO: event.endDate ? event.endDate.toISOString() : null,
        scope: event.scope,
        responsiblePerson: event.responsiblePerson ?? undefined,
        dateLabel: dayFormatter.format(date),
      }));

    return {
      dateLabel: dayFormatter.format(date),
      isoDate: isoDateStr,
      events: eventsForDay,
      supervisionMeal: supervisionMealMap[isoDateStr],
    };
  });

  // 주간 시간표 데이터 생성
  const weekDays = ["월", "화", "수", "목", "금"];
  const periods = ["1", "2", "3", "4", "점심", "5", "6", "7"];

  // 현재 시간에 해당하는 교시 계산 (한국 시간대 기준)
  const getCurrentPeriod = (): string | null => {
    const now = new Date();
    // 한국 시간대의 시간을 직접 가져오기
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    });
    const minuteFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      minute: "2-digit",
    });
    
    const hour = parseInt(hourFormatter.format(now));
    const minute = parseInt(minuteFormatter.format(now));
    const timeInMinutes = hour * 60 + minute;

    // 일반적인 교시 시간표 (한국 시간대 기준)
    // 1교시: 08:40-09:30
    // 2교시: 09:40-10:30
    // 3교시: 10:40-11:30
    // 4교시: 11:40-12:30
    // 점심: 12:30-13:30
    // 5교시: 13:30-14:20
    // 6교시: 14:30-15:20
    // 7교시: 15:40-16:30
    
    if (timeInMinutes >= 8 * 60 + 40 && timeInMinutes < 9 * 60 + 30) return "1";
    if (timeInMinutes >= 9 * 60 + 40 && timeInMinutes < 10 * 60 + 30) return "2";
    if (timeInMinutes >= 10 * 60 + 40 && timeInMinutes < 11 * 60 + 30) return "3";
    if (timeInMinutes >= 11 * 60 + 40 && timeInMinutes < 12 * 60 + 30) return "4";
    if (timeInMinutes >= 12 * 60 + 30 && timeInMinutes < 13 * 60 + 30) return "점심";
    if (timeInMinutes >= 13 * 60 + 30 && timeInMinutes < 14 * 60 + 20) return "5";
    if (timeInMinutes >= 14 * 60 + 30 && timeInMinutes < 15 * 60 + 20) return "6";
    if (timeInMinutes >= 15 * 60 + 40 && timeInMinutes < 16 * 60 + 30) return "7";
    
    return null;
  };

  const currentPeriod = getCurrentPeriod();

  type ScheduleCell = {
    courseId: string;
    courseSubject: string;
    groupId: string;
    groupName: string;
    classroom: string;
  };

  const weeklyScheduleTable: Record<string, Record<string, ScheduleCell[]>> = {};
  
  // 초기화
  weekDays.forEach((day) => {
    weeklyScheduleTable[day] = {};
    periods.forEach((period) => {
      weeklyScheduleTable[day][period] = [];
    });
  });

  // 모든 수업의 스케줄을 시간표에 매핑
  classes.forEach((course) => {
    course.classGroups.forEach((group) => {
      const schedules = parseSchedules(group.schedules);
      schedules.forEach((schedule) => {
        const day = schedule.day;
        const period = schedule.period;
        
        if (weekDays.includes(day) && periods.includes(period)) {
          weeklyScheduleTable[day][period].push({
            courseId: course.id,
            courseSubject: course.subject,
            groupId: group.id,
            groupName: group.name,
            classroom: course.classroom,
          });
        }
      });
    });
  });

  // 교직원 게시판 전체 개수 가져오기
  const staffAnnouncementsCount = await (prisma as any).announcement.count({
    where: {
      audience: "teacher",
      school: session.user.school || undefined,
      publishedAt: { not: null }, // 발행된 것만
    },
  });

  // 교직원 게시판 데이터 가져오기
  const staffAnnouncements = await (prisma as any).announcement.findMany({
    where: {
      audience: "teacher",
      school: session.user.school || undefined,
      publishedAt: { not: null }, // 발행된 것만
    },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });

  // 가정 안내문 전체 개수 가져오기 (실제 게시판과 동일한 조건)
  const parentAnnouncementsCount = await (prisma as any).announcement.count({
    where: {
      AND: [
        {
          OR: [
            { audience: "all" },
            { audience: "parents" },
            { audience: "grade-1" },
            { audience: "grade-2" },
            { audience: "grade-3" },
          ],
        },
        {
          NOT: { audience: "teacher" },
        },
      ],
      school: session.user.school || undefined,
      publishedAt: { not: null },
    },
  });

  // 가정 안내문 데이터 가져오기 (전체 데이터, 명시적으로 전체 개수만큼 가져오기)
  const parentAnnouncementsRaw = await (prisma as any).announcement.findMany({
    where: {
      AND: [
        {
          OR: [
            { audience: "all" },
            { audience: "parents" },
            { audience: "grade-1" },
            { audience: "grade-2" },
            { audience: "grade-3" },
          ],
        },
        {
          NOT: { audience: "teacher" },
        },
      ],
      school: session.user.school || undefined,
      publishedAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: parentAnnouncementsCount > 0 ? parentAnnouncementsCount : undefined, // 전체 개수만큼 명시적으로 가져오기
  });

  // API route와 동일하게 정렬: publishedAt 우선, 없으면 publishAt, 없으면 createdAt
  const parentAnnouncementsSorted = parentAnnouncementsRaw.sort((a: any, b: any) => {
    const aDate = a.publishedAt || a.publishAt || a.createdAt;
    const bDate = b.publishedAt || b.publishAt || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  // 상위 5개만 표시
  const parentAnnouncements = parentAnnouncementsSorted.slice(0, 5);

  // 디버깅: 실제 가져온 데이터 개수 확인 (개발 환경에서만)
  if (process.env.NODE_ENV === "development") {
    console.log(`[가정 안내문] 전체 개수: ${parentAnnouncementsCount}, 실제 가져온 개수: ${parentAnnouncementsRaw.length}`);
  }

  // 첨부파일 확인 함수
  const hasAttachments = (attachments: string | null | undefined): boolean => {
    if (!attachments) return false;
    try {
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  };

  // 날짜 포맷 함수
  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 구분 뱃지 함수
  const getCategoryBadge = (category: string | null | undefined) => {
    if (!category) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          -
        </span>
      );
    }

    const categoryLabels: Record<string, string> = {
      notice: "단순 알림",
      survey: "설문 조사",
      consent: "동의서",
    };

    const label = categoryLabels[category] || category;
    
    if (category === "notice") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          {label}
        </span>
      );
    } else if (category === "survey") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          {label}
        </span>
      );
    } else if (category === "consent") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          {label}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">
            안녕하세요 {session.user.name ?? t.dashboard.roleTeacher} 선생님 
          </h2>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 whitespace-nowrap">
            오늘은{" "}
            <span className="inline-block mx-1 px-2 py-1 text-xl font-bold text-blue-900 bg-blue-200 rounded-md">
              {new Intl.DateTimeFormat("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "2-digit",
                day: "2-digit",
                weekday: "long",
              }).format(now)}{" "}
            </span>
            입니다. 오늘 선생님의 수업은{" "}
            <span className="inline-block mx-1 px-2 py-1 text-xl font-bold text-blue-900 bg-blue-200 rounded-md">
              {todaysGroupCount}개
            </span>{" "}
            입니다.
            {(() => {
              const todayDuty = supervisionMealMap[isoToday];
              const teacherName = session.user.name?.trim() ?? "";
              const teacherEmail = session.user.email?.trim() ?? "";
              if (!todayDuty || (!teacherName && !teacherEmail)) return null;
              const matches = (s: string) => {
                const t = String(s).trim();
                return t && (t === teacherName || t === teacherEmail);
              };
              const hasYa = (todayDuty.eveningSupervision || []).some(matches);
              const hasMeal = (todayDuty.mealGuidance || []).some(matches);
              if (!hasYa && !hasMeal) return null;
              const parts: string[] = [];
              if (hasMeal) parts.push("급식지도");
              if (hasYa) parts.push("야자감독");
              return (
                <>
                  {" "}
                  오늘 <span className="inline-block mx-1 px-2 py-1 text-xl font-bold text-orange-900 bg-blue-200 rounded-md">{parts.join(", ")}</span> 담당입니다.
                </>
              );
            })()}
          </div>
        </div>
      </header>

      <WeeklyScheduleSection
        schedule={weeklySchedule}
        todayIsoDate={isoToday}
        moreHref="/dashboard/teacher/schedule"
        moreLabel="더보기 →"
      />

      <div className="flex gap-6 items-start">
        {/* 주간 시간표 섹션 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm w-1/3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">주간 시간표</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-1 py-2 font-semibold text-gray-700 min-w-[30px]">
                  교시
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day}
                    className={`border border-gray-300 px-1 py-2 font-semibold min-w-[60px] ${
                      day === todayDay 
                        ? "bg-yellow-100 text-yellow-900" 
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const isCurrentPeriod = currentPeriod === period;
                return (
                <tr key={period}>
                  <td className={`border border-gray-300 px-1 py-2 text-center font-medium ${
                    isCurrentPeriod
                      ? "bg-yellow-100 text-yellow-900 border-yellow-300" 
                      : "bg-gray-50 text-gray-700"
                  }`}>
                    {period}
                  </td>
                  {weekDays.map((day) => {
                    const cells = weeklyScheduleTable[day][period];
                    const isToday = day === todayDay;
                    const isCurrentCell = isToday && isCurrentPeriod;
                    return (
                      <td
                        key={`${day}-${period}`}
                        className={`border border-gray-300 px-1 py-2 align-top min-h-[80px] ${
                          isCurrentCell 
                            ? "bg-yellow-200 border-yellow-400 ring-2 ring-yellow-400" 
                            : "bg-white"
                        }`}
                      >
                        {cells.length > 0 ? (
                          <div className="space-y-1">
                            {cells.map((cell, idx) => (
                              <Link
                                key={`${cell.courseId}-${cell.groupId}-${idx}`}
                                href={`/dashboard/teacher/manage-classes/${cell.courseId}`}
                                className="block rounded-md bg-blue-100 hover:bg-blue-200 px-1 py-2 transition-colors cursor-pointer border border-blue-200"
                              >
                                <div className="font-medium text-blue-900 text-xs leading-tight">
                                  {cell.courseSubject}
                                </div>
                                <div className="text-xs text-blue-700 mt-1 leading-tight">
                                  {cell.groupName}
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs text-center py-2">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </section>

        <div className="flex-1 flex flex-col gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">바로가기</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/teacher/schedule"
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 cursor-pointer group"
            >
              <Calendar className="w-8 h-8 text-blue-600 mb-3 group-hover:text-blue-700" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-900">
                학사일정
              </span>
            </Link>

            <Link
              href="/dashboard/teacher/students"
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 transition-all duration-200 cursor-pointer group"
            >
              <Users className="w-8 h-8 text-green-600 mb-3 group-hover:text-green-700" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-green-900">
                학생명렬
              </span>
            </Link>

            <Link
              href="/dashboard/teacher/staff"
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 cursor-pointer group"
            >
              <UserCheck className="w-8 h-8 text-purple-600 mb-3 group-hover:text-purple-700" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-purple-900">
                교직원 명렬
              </span>
            </Link>

            <Link
              href="/dashboard/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-gray-200 bg-white hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 cursor-pointer group"
            >
              <MessageSquare className="w-8 h-8 text-orange-600 mb-3 group-hover:text-orange-700" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-orange-900">
                채팅하기
              </span>
            </Link>
          </div>
        </section>

        <CollaborativeDocLinksSection />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* 교직원 게시판 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">교직원 게시판</h2>
            <Link
              href="/dashboard/teacher/board_teachers"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              더보기 →
            </Link>
          </div>
          {staffAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">등록된 게시글이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {staffAnnouncements.map((announcement: any, index: number) => {
                // 전체 목록에서의 실제 글번호 계산 (역순)
                const globalIndex = index;
                const announcementNumber = staffAnnouncementsCount - globalIndex;
                return (
                <Link
                  key={announcement.id}
                  href={`/dashboard/teacher/board_teachers`}
                  className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 text-center text-xs text-gray-500 font-medium pt-0.5">
                      {announcementNumber}
                    </div>
                    <div className="flex-shrink-0">
                      {getCategoryBadge(announcement.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{announcement.author}</span>
                        <span>·</span>
                        <span>{formatDateShort(announcement.publishedAt || announcement.createdAt)}</span>
                      </div>
                    </div>
                    {hasAttachments(announcement.attachments) && (
                      <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 가정 안내문 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">가정 안내문</h2>
            <Link
              href="/dashboard/teacher/announcements"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              더보기 →
            </Link>
          </div>
          {parentAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">등록된 안내문이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {parentAnnouncements.map((announcement: any, index: number) => {
                // 전체 목록에서의 실제 글번호 계산 (역순)
                const globalIndex = index;
                const announcementNumber = parentAnnouncementsCount - globalIndex;
                return (
                <Link
                  key={announcement.id}
                  href={`/dashboard/teacher/announcements`}
                  className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 text-center text-xs text-gray-500 font-medium pt-0.5">
                      {announcementNumber}
                    </div>
                    <div className="flex-shrink-0">
                      {getCategoryBadge(announcement.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{announcement.author}</span>
                        <span>·</span>
                        <span>{formatDateShort(announcement.publishedAt || announcement.createdAt)}</span>
                      </div>
                    </div>
                    {hasAttachments(announcement.attachments) && (
                      <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <BannerSection isEditable={false} />



      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teacherSections.map((section) => (
          <article
            key={section.key}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{section.description}</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {section.action}
            </button>
          </article>
        ))}
      </section>


      <section className="grid gap-4 lg:grid-cols-2">
        <article className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            {t.dashboard.teacherScheduleTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {upcomingLessons.length === 0 ? (
              <li className="text-sm text-gray-600">
                {t.dashboard.teacherScheduleEmpty}
              </li>
            ) : (
              upcomingLessons.map((lesson) => (
                <li
                  key={lesson.title}
                  className="flex flex-col rounded-lg border border-gray-100 p-4"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {lesson.title}
                  </span>
                  <span className="text-sm text-gray-600 mt-1">{lesson.time}</span>
                  <span className="text-xs text-gray-500 mt-1">
                    {lesson.location}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            {t.dashboard.teacherSections.announcements.title}
          </h3>
          <ul className="mt-4 space-y-3">
            {quickNotes.map((note) => (
              <li
                key={note.title}
                className="flex flex-col rounded-lg border border-gray-100 p-4"
              >
                <span className="text-sm font-medium text-gray-900">
                  {note.title}
                </span>
                <span className="text-xs text-gray-500 mt-1">{note.date}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

    </div>
  );
}

