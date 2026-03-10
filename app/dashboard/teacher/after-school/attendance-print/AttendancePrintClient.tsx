"use client";

import type React from "react";

type PrintStudent = {
  id: string;
  name: string | null;
  email: string;
  studentId: string | null;
  classLabel: string | null;
};

type PrintDate = {
  dateKey: string;
  label: string;
  sessionNumber?: number;
};

type PrintPayload = {
  classGroupName: string;
  students: PrintStudent[];
  dates: PrintDate[];
};

type AttendancePrintClientProps = {
  searchParams: { [key: string]: string | string[] | undefined };
  teacherName: string;
};

export function AttendancePrintClient({ searchParams, teacherName }: AttendancePrintClientProps) {
  const dataParam = typeof searchParams.data === "string" ? searchParams.data : undefined;

  let payload: PrintPayload | null = null;
  if (dataParam) {
    try {
      const json = decodeURIComponent(dataParam);
      payload = JSON.parse(json) as PrintPayload;
    } catch (err) {
      console.error("Failed to parse print data", err);
    }
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">출석부 데이터를 불러올 수 없습니다.</h1>
          <p className="text-sm text-gray-600 mb-4">
            출석부 페이지에서 다시 인쇄를 시도하거나, 브라우저 새로고침 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  const { classGroupName, students, dates } = payload;

  return (
    <div className="min-h-screen bg-white p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">출석부</h1>
        <div className="text-base text-gray-700 space-y-1">
          <p>
            <span className="font-semibold">학반: </span>
            <span className="ml-2 font-medium">{classGroupName}</span>
          </p>
          <p className="text-[13px]">
            <span className="font-semibold">담당 교사: </span>
            <span className="ml-2">{teacherName}</span>
            <span className="ml-2"> (인)</span>

          </p>
        </div>
      </header>

      <main>
        <div className="overflow-auto">
          <table className="w-full border-collapse table-fixed text-sm">
            <thead>
              <tr>
                <th className="border border-gray-400 px-2 py-2 bg-gray-100 w-6 text-center font-semibold">
                  순
                </th>
                <th className="border border-gray-400 px-2 py-2 text-center bg-gray-100 w-20">이름</th>
                {dates.map((d, index) => {
                  const parts = d.label.split(" ");
                  const dateText = parts[0] ?? "";
                  const periodText = parts.slice(1).join(" ");
                  const session = d.sessionNumber ?? index + 1;
                  return (
                    <th
                      key={d.dateKey}
                      className="border border-gray-400 px-2 py-2 text-center bg-gray-100 text-xs whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center leading-snug space-y-0.5">
                        <span className="font-semibold">{session}차시</span>
                        <span className="text-[10px]">{dateText}</span>
                        <span className="text-[10px] text-gray-600">{periodText}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="border border-gray-400 px-2 py-2 text-center bg-gray-100 text-xs whitespace-nowrap w-10">
                  계
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, index) => (
                <tr key={s.id}>
                  <td className="border border-gray-300 px-2 py-1 bg-white text-center text-xs">
                    {index + 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 whitespace-nowrap bg-white">
                    <span className="mr-2 text-xs text-gray-500">
                      {s.studentId ?? ""}
                    </span>
                    <span>{s.name ?? s.email ?? "이름 없음"}</span>
                  </td>
                  {dates.map((d) => (
                    <td
                      key={d.dateKey}
                      className="border border-gray-300 px-2 py-1 text-center align-middle bg-white"
                    >
                      {/* 비워 두어 수기로 기입할 수 있게 함 */}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 bg-white">{/* 여분 열 */}</td>
                </tr>
              ))}
              {/* 추가 빈 행: 출석수 */}
              <tr>
                <td className="border border-gray-300 px-2 py-1 bg-white">{/* 왼쪽 여백 열 */}</td>
                <td className="border border-gray-300 px-2 py-1 bg-white text-xs font-semibold text-gray-700">
                  출석수
                </td>
                {dates.map((d) => (
                  <td
                    key={`extra-count-${d.dateKey}`}
                    className="border border-gray-300 px-2 py-1 bg-white"
                  >
                    {/* 여분 빈 셀 */}
                  </td>
                ))}
                <td className="border border-gray-300 px-2 py-1 bg-white">{/* 여분 열 */}</td>
              </tr>
              {/* 추가 빈 행: 출석률 */}
              <tr>
                <td className="border border-gray-300 px-2 py-1 bg-white">{/* 왼쪽 여백 열 */}</td>
                <td className="border border-gray-300 px-2 py-1 bg-white text-xs font-semibold text-gray-700">
                  출석률
                </td>
                {dates.map((d) => (
                  <td
                    key={`extra-rate-${d.dateKey}`}
                    className="border border-gray-300 px-2 py-1 bg-white"
                  >
                    {/* 여분 빈 셀 */}
                  </td>
                ))}
                <td className="border border-gray-300 px-2 py-1 bg-white">{/* 여분 열 */}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

