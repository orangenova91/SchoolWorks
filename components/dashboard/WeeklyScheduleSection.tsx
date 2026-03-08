"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Moon, UtensilsCrossed } from "lucide-react";

type WeeklyScheduleEvent = {
  id: string;
  title: string;
  displayTime: string;
  eventType: string | null;
  department?: string;
  description?: string;
  startDateISO: string;
  endDateISO?: string | null;
  scope: string;
  responsiblePerson?: string;
  dateLabel: string;
};

type SupervisionMealInfo = {
  eveningSupervision: string[];
  mealGuidance: string[];
};

type WeeklyScheduleDay = {
  dateLabel: string;
  isoDate: string;
  events: WeeklyScheduleEvent[];
  supervisionMeal?: SupervisionMealInfo;
};

type WeeklyScheduleSectionProps = {
  schedule: WeeklyScheduleDay[];
  todayIsoDate: string;
  moreHref?: string;
  moreLabel?: string;
  currentTeacherName?: string;
  currentTeacherEmail?: string;
};

const formatDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function WeeklyScheduleSection({
  schedule,
  todayIsoDate,
  moreHref,
  moreLabel = "학사일정 바로가기 →",
  currentTeacherName,
  currentTeacherEmail,
}: WeeklyScheduleSectionProps) {
  // removed click-to-toggle selectedEvent; using hover tooltip only
  const [hoverTooltip, setHoverTooltip] = useState<
    { event: WeeklyScheduleEvent; rect: DOMRect } | null
  >(null);

  // isoDate로부터 요일을 계산하는 함수 (0=일요일, 6=토요일)
  const getDayOfWeek = (isoDate: string): number => {
    const date = new Date(isoDate + "T00:00:00");
    return date.getDay();
  };

  const matchesCurrentTeacher = (raw: string): boolean => {
    const value = raw?.trim().toLowerCase();
    if (!value) return false;

    const name = currentTeacherName?.trim().toLowerCase();
    const email = currentTeacherEmail?.trim().toLowerCase();

    // 이름이 있으면 우선 이름으로 비교, 그 다음 이메일도 허용
    if (name && value === name) return true;
    if (email && value === email) return true;
    return false;
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">이번 주 학사일정</h3>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {moreLabel}
          </Link>
        )}
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-7 bg-gray-50 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {schedule.map((day) => {
            const isToday = day.isoDate === todayIsoDate;
            const dayOfWeek = getDayOfWeek(day.isoDate);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            
            let headerBgClass = "";
            let headerTextClass = "";
            if (isToday) {
              headerBgClass = "bg-yellow-100";
              headerTextClass = "text-yellow-900";
            } else if (isSunday) {
              headerBgClass = "bg-red-50";
              headerTextClass = "text-red-700";
            } else if (isSaturday) {
              headerBgClass = "bg-blue-50";
              headerTextClass = "text-blue-600";
            }
            
            return (
              <div
                key={`${day.dateLabel}-header`}
                className={`px-4 py-3 border-r border-gray-100 last:border-r-0 ${headerBgClass} ${headerTextClass}`}
              >
                {day.dateLabel}
              </div>
            );
          })}
        </div>
        <div className="md:hidden grid grid-cols-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
          {schedule.map((day) => {
            const dayOfWeek = getDayOfWeek(day.isoDate);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            
            let headerBgClass = "";
            let headerTextClass = "";
            if (isSunday) {
              headerBgClass = "bg-red-50";
              headerTextClass = "text-red-700";
            } else if (isSaturday) {
              headerBgClass = "bg-blue-50";
              headerTextClass = "text-blue-600";
            }
            
            return (
              <div
                key={`${day.dateLabel}-header-mobile`}
                className={`px-2 py-2 border-r border-gray-100 last:border-r-0 ${headerBgClass} ${headerTextClass}`}
              >
                {day.dateLabel}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-100 max-h-[280px]">
          {schedule.map((day) => {
            const isToday = day.isoDate === todayIsoDate;
            const dayOfWeek = getDayOfWeek(day.isoDate);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            
            let bodyBgClass = "";
            if (isToday) {
              bodyBgClass = "bg-yellow-50";
            } else if (isSunday) {
              bodyBgClass = "bg-red-50/30";
            } else if (isSaturday) {
              bodyBgClass = "bg-blue-50/30";
            }
            
            const hasSupervisionMeal =
              day.supervisionMeal &&
              ((day.supervisionMeal.eveningSupervision?.length || 0) > 0 ||
                (day.supervisionMeal.mealGuidance?.length || 0) > 0);

            return (
              <div
                key={`${day.dateLabel}-body`}
                className={`p-4 flex flex-col max-h-[240px] md:min-h-0 ${bodyBgClass}`}
              >
                <p className="md:hidden text-sm font-semibold text-gray-900 mb-2">
                  {day.dateLabel}
                </p>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                  {day.events.length === 0 && !hasSupervisionMeal ? (
                    <p className="text-xs text-gray-400">등록된 일정이 없습니다.</p>
                  ) : (
                    day.events.map((event) => {
                    return (
                      <div
                        key={event.id}
                        className="relative"
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setHoverTooltip({ event, rect });
                        }}
                        onMouseMove={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setHoverTooltip({ event, rect });
                        }}
                        onMouseLeave={() => setHoverTooltip(null)}
                      >
                        <button
                          type="button"
                          className="w-full text-left rounded-lg border py-2 px-3 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border-gray-100 bg-white/50 hover:bg-white hover:border-blue-200"
                        >
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {event.title}
                          </p>
                        </button>
                      </div>
                    );
                    })
                  )}
                </div>
                <div className="mt-auto pt-2 border-t border-gray-100 min-h-[2.5rem] flex-shrink-0 text-xs text-gray-600 space-y-1">
                  {hasSupervisionMeal && day.supervisionMeal && (
                    <Link
                      href="/dashboard/teacher/academic-preparation?tab=supervision-meal"
                      className="block space-y-1 hover:text-blue-600 transition-colors cursor-pointer group"
                      title="급식지도/야자감독 일정 보기"
                    >
                      {(day.supervisionMeal.mealGuidance || []).filter(Boolean).length > 0 && (
                        <div className="flex items-start gap-1.5 group-hover:text-blue-600">
                          <UtensilsCrossed className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500 group-hover:text-blue-600" />
                          <span className="flex flex-wrap gap-x-1">
                            {(day.supervisionMeal.mealGuidance || [])
                              .filter(Boolean)
                              .map((name, idx, arr) => {
                                const isMe = matchesCurrentTeacher(String(name));
                                return (
                                  <span key={idx} className="inline-flex items-center gap-1">
                                    <span
                                      className={
                                        isMe
                                          ? "inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-[12px] px-1.5 py-0.5 font-semibold"
                                          : "text-sm"
                                      }
                                    >
                                      {name}
                                    </span>
                                    {idx < arr.length - 1 && <span>,</span>}
                                  </span>
                                );
                              })}
                          </span>
                        </div>
                      )}
                      {(day.supervisionMeal.eveningSupervision || []).filter(Boolean).length > 0 && (
                        <div className="flex items-start gap-1.5 group-hover:text-blue-600">
                          <Moon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500 group-hover:text-blue-600" />
                          <span className="flex flex-wrap gap-x-1">
                            {(day.supervisionMeal.eveningSupervision || [])
                              .filter(Boolean)
                              .map((name, idx, arr) => {
                                const isMe = matchesCurrentTeacher(String(name));
                                return (
                                  <span key={idx} className="inline-flex items-center gap-1">
                                    <span
                                      className={
                                        isMe
                                          ? "inline-flex items-center rounded-full bg-orange-100 text-orange-800 text-[12px] px-1.5 py-0.5 font-semibold"
                                          : "text-sm"
                                      }
                                    >
                                      {name}
                                    </span>
                                    {idx < arr.length - 1 && <span className="text-sm">, </span>}
                                  </span>
                                );
                              })}
                          </span>
                        </div>
                      )}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* click-to-open detailed panel removed; hover tooltip used instead */}
      {hoverTooltip &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="hidden md:block pointer-events-none z-50"
            style={{
              position: "absolute",
              left: `${hoverTooltip.rect.left + hoverTooltip.rect.width / 2}px`,
              top: `${hoverTooltip.rect.top - 8}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-800 max-w-xs">
              <div className="font-medium mb-1">{hoverTooltip.event.title}</div>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div><span className="font-medium text-gray-700">구분: </span>{hoverTooltip.event.eventType ?? "교과"}</div>
                <div><span className="font-medium text-gray-700">학년: </span>{(hoverTooltip.event as any).gradeLevels?.join(", ") ?? "-"}</div>
                <div><span className="font-medium text-gray-700">교시: </span>{(hoverTooltip.event as any).periods?.join(", ") ?? "-"}</div>
                <div><span className="font-medium text-gray-700">부서: </span>{hoverTooltip.event.department ?? "-"}</div>
                <div><span className="font-medium text-gray-700">담당자: </span>{hoverTooltip.event.responsiblePerson ?? "-"}</div>
              </div>
            </div>
            <div className="w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45 mt-1" style={{ margin: "0 auto" }} />
          </div>,
          document.body
        )}
    </section>
  );
}


