"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";

export type ScheduleCell = {
  courseId: string;
  courseSubject: string;
  groupId: string;
  groupName: string;
  classroom: string;
};

type WeeklySchedulePanelProps = {
  weekDays: string[];
  periods: string[];
  weeklyScheduleTable: Record<string, Record<string, ScheduleCell[]>>;
  todayDay: string;
  currentPeriod: string;
};

export function WeeklySchedulePanel({
  weekDays,
  periods,
  weeklyScheduleTable,
  todayDay,
  currentPeriod,
}: WeeklySchedulePanelProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm font-medium shadow-sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="주간 시간표 보기"
      >
        <Calendar className="w-4 h-4" />
        시간표 보기
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-[90vw] max-w-[640px] bg-white rounded-xl border border-gray-200 p-6 shadow-lg"
          role="dialog"
          aria-label="주간 시간표"
        >
          <div className="flex items-center justify-between w-full mb-4">
            {/* 왼쪽 그룹: 제목과 더보기 버튼 */}
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 shrink-0">
                주간 시간표
              </h2>
              <Link
                href="/dashboard/teacher/manage-classes"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                시간표 작성하기 →
              </Link>
            </div>

            {/* 오른쪽 그룹: 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
            >
              닫기
            </button>
          </div>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 px-1 py-2 font-semibold text-gray-700 min-w-[30px] sticky top-0 bg-gray-50">
                    교시
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day}
                      className={`border border-gray-300 px-1 py-2 font-semibold min-w-[60px] sticky top-0 ${
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
                      <td
                        className={`border border-gray-300 px-1 py-2 text-center font-medium ${
                          isCurrentPeriod
                            ? "bg-yellow-100 text-yellow-900 border-yellow-300"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {period}
                      </td>
                      {weekDays.map((day) => {
                        const cells = weeklyScheduleTable[day]?.[period] ?? [];
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
                                    onClick={() => setOpen(false)}
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
                              <div className="text-gray-400 text-xs text-center py-2">
                                -
                              </div>
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
        </div>
      )}
    </div>
  );
}
