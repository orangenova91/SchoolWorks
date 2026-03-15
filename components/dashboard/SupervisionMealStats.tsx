"use client";

import { useState, useEffect } from "react";

export type TeacherForStats = {
  id: string;
  name: string | null;
  email: string;
  roleLabel: string | null;
};

type StatsData = {
  year: number;
  meal: Record<string, number>;
  evening: Record<string, number>;
};

type SupervisionMealStatsProps = {
  viewDate: Date;
  scheduleRefreshKey: number;
  teachers: TeacherForStats[];
};

export function SupervisionMealStats({
  viewDate,
  scheduleRefreshKey,
  teachers,
}: SupervisionMealStatsProps) {
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!showStats) return;
    const statsYear = viewDate.getFullYear();
    setStatsLoading(true);
    fetch(`/api/academic-preparation/supervision-meal/stats?year=${statsYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.meal != null && data.evening != null) {
          setStatsData({ year: data.year ?? statsYear, meal: data.meal, evening: data.evening });
        } else {
          setStatsData(null);
        }
      })
      .catch(() => setStatsData(null))
      .finally(() => setStatsLoading(false));
  }, [showStats, viewDate, scheduleRefreshKey]);

  return (
    <div className="print:hidden">
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          aria-pressed={showStats}
          onClick={() => setShowStats((s) => !s)}
          className="text-sm text-blue-600 hover:text-blue-700 transition"
        >
          통계 보기 {showStats ? "▼" : "▲"}
        </button>
        {showStats && (
          <span className="text-xs text-gray-500">({viewDate.getFullYear()}년 누적)</span>
        )}
      </div>
      {showStats && (
        <div className="p-3 rounded-md border border-dashed border-gray-300 bg-gray-100/50 min-h-[48px]">
          {statsLoading ? (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          ) : !statsData ? (
            <div className="text-sm text-gray-500">통계 데이터가 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-6 overflow-visible">
              {/* 급식지도: 교사 목록 기준, 0회 포함 */}
              <div className="flex-shrink-0 min-h-0">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  급식지도 ({statsData.year}년 누적)
                </div>
                {(() => {
                  const teacherKeys = new Set(teachers.map((t) => t.name || t.email));
                  const mealList: Array<{ name: string; count: number }> = [
                    ...teachers.map((t) => ({
                      name: t.name || t.email,
                      count: statsData.meal[t.name || t.email] ?? 0,
                    })),
                    ...Object.entries(statsData.meal)
                      .filter(([name]) => !teacherKeys.has(name))
                      .map(([name, count]) => ({ name, count })),
                  ].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
                  const mealTotal = mealList.reduce((s, x) => s + x.count, 0);
                  if (mealList.length === 0) {
                    return <div className="text-xs text-gray-500">데이터 없음</div>;
                  }
                  return (
                    <div className="flex flex-wrap items-end gap-3">
                      {mealList.map(({ name, count }) => {
                        const ratio = mealTotal > 0 ? Math.round((count / mealTotal) * 100) : 0;
                        return (
                          <div
                            key={name}
                            className="flex flex-col items-center gap-2 min-w-[40px] max-w-[60px] min-h-[8.5rem]"
                          >
                            <div className="relative w-full flex-1 min-h-[80px] bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end">
                              <div
                                className="w-full rounded-t-lg transition-all duration-500 flex-shrink-0"
                                style={{
                                  height: ratio > 0 ? `${Math.max(ratio, 2)}%` : "0",
                                  minHeight: ratio > 0 ? 4 : 0,
                                  backgroundColor: "#d97706",
                                }}
                              />
                              <div className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[11px] text-gray-400 bg-transparent pointer-events-none">
                                {ratio}%
                              </div>
                            </div>
                            <div className="h-12 flex flex-col items-center justify-center text-center">
                              <div className="text-xs truncate w-full" title={name}>
                                {name}
                              </div>
                              <div className="text-xs font-semibold">{count}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              {/* 야자감독: 교사 목록 기준, 0회 포함 */}
              <div className="flex-shrink-0 min-h-0">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  야자감독 ({statsData.year}년 누적)
                </div>
                {(() => {
                  const teacherKeys = new Set(teachers.map((t) => t.name || t.email));
                  const eveningList: Array<{ name: string; count: number }> = [
                    ...teachers.map((t) => ({
                      name: t.name || t.email,
                      count: statsData.evening[t.name || t.email] ?? 0,
                    })),
                    ...Object.entries(statsData.evening)
                      .filter(([name]) => !teacherKeys.has(name))
                      .map(([name, count]) => ({ name, count })),
                  ].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
                  const eveningTotal = eveningList.reduce((s, x) => s + x.count, 0);
                  if (eveningList.length === 0) {
                    return <div className="text-xs text-gray-500">데이터 없음</div>;
                  }
                  return (
                    <div className="flex flex-wrap items-end gap-3">
                      {eveningList.map(({ name, count }) => {
                        const ratio =
                          eveningTotal > 0 ? Math.round((count / eveningTotal) * 100) : 0;
                        return (
                          <div
                            key={name}
                            className="flex flex-col items-center gap-2 min-w-[40px] max-w-[60px] min-h-[8.5rem]"
                          >
                            <div className="relative w-full flex-1 min-h-[80px] bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end">
                              <div
                                className="w-full rounded-t-lg transition-all duration-500 flex-shrink-0"
                                style={{
                                  height: ratio > 0 ? `${Math.max(ratio, 2)}%` : "0",
                                  minHeight: ratio > 0 ? 4 : 0,
                                  backgroundColor: "#0ea5e9",
                                }}
                              />
                              <div className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[11px] text-gray-400 bg-transparent pointer-events-none">
                                {ratio}%
                              </div>
                            </div>
                            <div className="h-12 flex flex-col items-center justify-center text-center">
                              <div className="text-xs truncate w-full" title={name}>
                                {name}
                              </div>
                              <div className="text-xs font-semibold">{count}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
