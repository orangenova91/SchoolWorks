"use client";

import { useState, useEffect } from "react";
import { Select } from "@/components/ui/Select";

export type HomeroomStudentForRecord = {
  id: string;
  name: string | null;
  email: string;
  studentProfile?: { studentId?: string | null } | null;
};

type CreativeEventRow = {
  id: string;
  title: string;
  startDate: Date;
  gradeLevels: string[];
  eventType: string;
  activityQuestionCount: number;
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  "자율*자치": "#dc2626",
  "동아리": "#2563eb",
  "진로": "#16a34a",
  "봉사": "#ca8a04",
  "학사행사": "#9333ea",
  "개인 일정": "#0d9488",
};

const FILTER_BADGES: { key: string; label: string }[] = [
  { key: "자율*자치", label: "자" },
  { key: "동아리", label: "동" },
  { key: "봉사", label: "봉" },
  { key: "진로", label: "진" },
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function getAcademicYear(date: Date): number {
  const month = date.getMonth();
  return month >= 2 ? date.getFullYear() : date.getFullYear() - 1;
}

type LifeRecordManagementProps = {
  students?: HomeroomStudentForRecord[];
};

export default function LifeRecordManagement({ students = [] }: LifeRecordManagementProps) {
  const [events, setEvents] = useState<CreativeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);

  const filteredEvents = eventTypeFilter
    ? events.filter((e) => e.eventType === eventTypeFilter)
    : events;

  const studentOptions = [
    { value: "", label: "학생 선택" },
    ...students.map((s) => ({
      value: s.id,
      label: [s.studentProfile?.studentId, s.name || s.email].filter(Boolean).join(" ") || s.email,
    })),
  ];

  useEffect(() => {
    const year = getAcademicYear(new Date());
    const start = new Date(year, 2, 1);
    const end = new Date(year + 1, 1, 28, 23, 59, 59);
    const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (isLeap(year + 1)) end.setDate(29);

    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/calendar-events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&scope=all`
    )
      .then((res) => res.json())
      .then((data: { events?: Array<{ id: string; title: string; start: string; extendedProps?: Record<string, unknown> }> }) => {
        if (cancelled) return;
        const list = data.events || [];
        const creative = list
          .filter((e) => (e.extendedProps?.scheduleArea as string) === "창의적 체험활동")
          .map((e) => ({
            id: e.id,
            title: e.title,
            startDate: new Date(e.start),
            gradeLevels: (e.extendedProps?.gradeLevels as string[]) || [],
            eventType: (e.extendedProps?.eventType as string) || "교과",
            activityQuestionCount: (e.extendedProps?.activityQuestionCount as number) ?? 0,
          }))
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        setEvents(creative);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      aria-label="생활기록부 관리"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">생활기록부 관리</h2>
      </header>
      <div className="flex flex-row gap-4 min-w-0">
        <section
          className="w-[200px] shrink-0 min-h-[120px] rounded-lg border border-gray-100 bg-gray-50/50 p-3 flex flex-col gap-2"
          aria-label="왼쪽 섹션"
        >
          <Select
            label="학급 학생"
            options={studentOptions}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full"
          />
        </section>
        <section
          className="flex-1 min-w-0 rounded-lg border border-gray-100 bg-gray-50/50 overflow-hidden"
          aria-label="오른쪽 섹션"
        >
          <div className="p-3 overflow-auto h-full">
            {loading ? (
              <p className="text-sm text-gray-500 py-4 text-center">일정을 불러오는 중...</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">창의적 체험활동 일정이 없습니다.</p>
            ) : (
              <table className="w-full border-collapse table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "34%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">날짜</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">제목</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">학년</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <span className="block mb-1.5">구분</span>
                      <div className="flex flex-wrap justify-center gap-1">
                        {FILTER_BADGES.map(({ key, label }) => {
                          const color = EVENT_TYPE_COLORS[key] ?? "#6b7280";
                          const isActive = eventTypeFilter === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setEventTypeFilter(isActive ? null : key)}
                              className="text-xs font-medium px-1 py-0 rounded-full border-2 transition-all hover:opacity-90"
                              style={{
                                backgroundColor: isActive ? color : "transparent",
                                borderColor: color,
                                color: isActive ? "#ffffff" : color,
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">활동지</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-sm text-gray-500">
                        해당 구분의 일정이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => {
                      const eventColor = EVENT_TYPE_COLORS[event.eventType] ?? "#6b7280";
                      return (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{formatDate(event.startDate)}</td>
                          <td className="px-2 py-2 text-gray-900 font-medium min-w-0 truncate" title={event.title}>
                            {event.title}
                          </td>
                          <td className="px-2 py-2 text-gray-500 text-center whitespace-nowrap">
                            {event.gradeLevels.length ? `${event.gradeLevels.join(", ")}학년` : "-"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              className="inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap border"
                              style={{ backgroundColor: eventColor, borderColor: eventColor, color: "#ffffff" }}
                            >
                              {event.eventType}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center text-gray-500">
                            {event.activityQuestionCount > 0 ? `${event.activityQuestionCount}개 질문` : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
