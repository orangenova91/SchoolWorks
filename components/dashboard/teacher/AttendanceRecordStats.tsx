"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { AttendanceRecord } from "./AttendanceRecordList";
import { labelAttendanceType } from "@/lib/attendanceTypeLabels";
import { getWeekdayAbsenceDayCount } from "@/lib/attendanceAbsenceDays";

/** 유형별 건수 차트 X축 순서 (표시 라벨 = labelAttendanceType 결과와 동일) */
const CHART_TYPE_ORDER = [
  "지각",
  "결과",
  "조퇴",
  "결석 (질병)",
  "결석 (인정)",
  "결석 (기타)",
] as const;

function formatMonthTitle(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return `${y}년 ${String(m).padStart(2, "0")}월`;
}

type AttendanceRecordStatsProps = {
  records: AttendanceRecord[];
  monthKey: string;
  isLoading: boolean;
};

export function AttendanceRecordStats({
  records,
  monthKey,
  isLoading,
}: AttendanceRecordStatsProps) {
  const stats = useMemo(() => {
    const byLabel: Record<string, number> = {};
    const byStudent = new Map<
      string,
      { name: string | null; count: number }
    >();
    let weekdayDaysSum = 0;

    for (const r of records) {
      const label = labelAttendanceType(r.type);
      byLabel[label] = (byLabel[label] ?? 0) + 1;

      const prev = byStudent.get(r.studentId);
      byStudent.set(r.studentId, {
        name: r.studentName ?? prev?.name ?? null,
        count: (prev?.count ?? 0) + 1,
      });

      if (r.startDate && r.endDate) {
        weekdayDaysSum += getWeekdayAbsenceDayCount(r.startDate, r.endDate);
      }
    }

    const ordered = CHART_TYPE_ORDER.map((name) => ({
      name,
      count: byLabel[name] ?? 0,
    }));
    const known = new Set<string>(CHART_TYPE_ORDER);
    const extras = Object.entries(byLabel)
      .filter(([k]) => !known.has(k))
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const chartData = [...ordered, ...extras];

    const topStudents = [...byStudent.entries()]
      .map(([studentId, v]) => ({
        studentId,
        name: v.name,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: records.length,
      uniqueStudents: byStudent.size,
      weekdayDaysSum,
      chartData,
      topStudents,
    };
  }, [records]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        출결 통계
      </h3>
      <p className="text-sm text-gray-500 mb-4">{formatMonthTitle(monthKey)}</p>

      {isLoading ? (
        <p className="text-sm text-gray-600">불러오는 중…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-600">
          해당 월에 등록된 출결 기록이 없습니다.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-500">총 건수</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {stats.total}
              </p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-500">관련 학생 수</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {stats.uniqueStudents}
              </p>
            </div>
            <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-500">
                평일 일수 합 (기간 기준)
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {stats.weekdayDaysSum}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-gray-400">
                각 기록의 시작~종료일 중 월~금만 합산
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                유형별 건수
              </h4>
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={36}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v: number | string) => [`${v}건`, "건수"]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                기록 건수 상위 학생
              </h4>
              {stats.topStudents.length === 0 ? (
                <p className="text-sm text-gray-500">데이터 없음</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                  {stats.topStudents.map((row, i) => (
                    <li
                      key={row.studentId}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {i + 1}
                        </span>
                        <span className="truncate text-gray-900">
                          {row.name ?? "(이름 없음)"}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-gray-700">
                        {row.count}건
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
