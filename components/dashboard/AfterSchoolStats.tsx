"use client";

import { useEffect, useState } from "react";

type AttendanceStat = {
  courseId: string;
  courseSubject: string;
  classGroupId: string;
  classGroupName: string;
  totalExpectedCount: number;
  nonPresentCount: number;
  attendanceRate: number;
};

export default function AfterSchoolStats() {
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/after-school/attendance-stats");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "출석 통계를 불러오지 못했습니다.");
        }
        const data = await res.json();
        if (!cancelled) {
          setStats(Array.isArray(data.stats) ? data.stats : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "출석 통계를 불러오지 못했습니다.");
          setStats([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        출석 통계를 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        아직 집계할 수 있는 방과후 출석 데이터가 없습니다. 방과후 수업의 출석부를 저장하면 이곳에 출석률이 표시됩니다.
      </div>
    );
  }

  const overallTotal = stats.reduce((sum, s) => sum + s.totalExpectedCount, 0);
  const overallNonPresent = stats.reduce((sum, s) => sum + s.nonPresentCount, 0);
  const overallRate =
    overallTotal > 0 ? (overallTotal - overallNonPresent) / overallTotal : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">방과후 출석 통계</h2>
        <p className="text-sm text-gray-600 mb-4">
          방과후 수업 출석부에 저장된 데이터를 기반으로 학반별 출석률을 확인할 수 있습니다.
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700">전체 방과후 출석률</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {(overallRate * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-gray-500">
            총 {overallTotal} 회 중 결석/지각 {overallNonPresent} 회
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700">강좌 수</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {new Set(stats.map((s) => s.courseId)).size}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700">학반 수</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {stats.length}
          </p>
        </div>
      </div>

      {/* 학반별 출석률 테이블 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          학반별 방과후 출석률
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  강좌명
                </th>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  학반
                </th>
                <th className="w-1/5 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                  출석률
                </th>
                <th className="w-1/5 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                  결석/지각 등
                </th>
                <th className="w-1/5 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                  총 수업*학생
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {stats.map((s) => (
                <tr key={`${s.courseId}-${s.classGroupId}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900 truncate">
                    {s.courseSubject || s.courseId}
                  </td>
                  <td className="px-3 py-2 text-gray-700 truncate">
                    {s.classGroupName || s.classGroupId}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {(s.attendanceRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">
                    {s.nonPresentCount}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    {s.totalExpectedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          * 총 수업*학생 = 출석부가 저장된 날짜 수 × 해당 학반 학생 수 기준입니다.
        </p>
      </div>
    </div>
  );
}

