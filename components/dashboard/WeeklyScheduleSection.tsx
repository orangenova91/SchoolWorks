"use client";

import { useState } from "react";

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

type WeeklyScheduleDay = {
  dateLabel: string;
  isoDate: string;
  events: WeeklyScheduleEvent[];
};

type WeeklyScheduleSectionProps = {
  schedule: WeeklyScheduleDay[];
  todayIsoDate: string;
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
}: WeeklyScheduleSectionProps) {
  const [selectedEvent, setSelectedEvent] = useState<WeeklyScheduleEvent | null>(
    null
  );

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">이번 주 학사일정</h3>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-7 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {schedule.map((day) => {
            const isToday = day.isoDate === todayIsoDate;
            const isWeekend =
              new Date(day.isoDate).getDay() === 0 ||
              new Date(day.isoDate).getDay() === 6;
            const weekendHeaderClass = isWeekend
              ? "bg-orange-50 text-orange-700"
              : "";
            return (
              <div
                key={`${day.dateLabel}-header`}
                className={`px-4 py-3 border-r border-gray-100 last:border-r-0 ${weekendHeaderClass} ${
                  isToday ? "bg-blue-100 text-blue-700" : ""
                }`}
              >
                {day.dateLabel}
              </div>
            );
          })}
        </div>
        <div className="md:hidden grid grid-cols-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
          {schedule.map((day) => (
            <div
              key={`${day.dateLabel}-header-mobile`}
              className="px-2 py-2 border-r border-gray-100 last:border-r-0"
            >
              {day.dateLabel}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-100 max-h-[280px]">
          {schedule.map((day) => {
            const isToday = day.isoDate === todayIsoDate;
            const isWeekend =
              new Date(day.isoDate).getDay() === 0 ||
              new Date(day.isoDate).getDay() === 6;
            const weekendBodyClass = isWeekend ? "bg-orange-50/60" : "";
            return (
              <div
                key={`${day.dateLabel}-body`}
                className={`p-4 space-y-3 max-h-[240px] overflow-y-auto md:min-h-0 ${weekendBodyClass} ${
                  isToday ? "bg-blue-50" : ""
                }`}
              >
                <p className="md:hidden text-sm font-semibold text-gray-900">
                  {day.dateLabel}
                </p>
                {day.events.length === 0 ? (
                  <p className="text-xs text-gray-400">등록된 일정이 없습니다.</p>
                ) : (
                  day.events.map((event) => {
                    const isSelected = selectedEvent?.id === event.id;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() =>
                          setSelectedEvent(isSelected ? null : event)
                        }
                        className={`w-full text-left rounded-lg border px-3 py-2 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isSelected
                            ? "border-blue-200 bg-white"
                            : "border-gray-100 bg-white/50 hover:bg-white hover:border-blue-200"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {event.title}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedEvent && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/30 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  {selectedEvent.dateLabel}
                </p>
                <h4 className="text-xl font-bold text-gray-900 mt-1">
                  {selectedEvent.title}
                </h4>
              </div>
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                {selectedEvent.eventType || "교과"}
              </span>
            </div>

            <dl className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-4">
                <dt className="w-20 text-gray-500 font-medium">시간</dt>
                <dd className="flex-1 text-gray-900">
                  {formatDateTime(selectedEvent.startDateISO) ??
                    selectedEvent.displayTime}
                  {selectedEvent.endDateISO &&
                    ` ~ ${formatDateTime(selectedEvent.endDateISO)}`}
                </dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="w-20 text-gray-500 font-medium">범위</dt>
                <dd className="flex-1 text-gray-900">{selectedEvent.scope}</dd>
              </div>
              {selectedEvent.department && (
                <div className="flex items-start gap-4">
                  <dt className="w-20 text-gray-500 font-medium">부서</dt>
                  <dd className="flex-1 text-gray-900">
                    {selectedEvent.department}
                  </dd>
                </div>
              )}
              {selectedEvent.responsiblePerson && (
                <div className="flex items-start gap-4">
                  <dt className="w-20 text-gray-500 font-medium">담당자</dt>
                  <dd className="flex-1 text-gray-900">
                    {selectedEvent.responsiblePerson}
                  </dd>
                </div>
              )}
            </dl>

            {selectedEvent.description ? (
              <div className="border-t border-blue-100 pt-4">
                <h5 className="text-sm font-semibold text-gray-800 mb-2">
                  상세 설명
                </h5>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedEvent.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 border-t border-blue-100 pt-4">
                상세 설명이 없습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


