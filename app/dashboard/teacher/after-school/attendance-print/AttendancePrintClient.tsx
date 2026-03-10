"use client";

import type React from "react";
import { useEffect } from "react";
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

const headerCellBase =
  "border border-gray-400 px-2 py-2 bg-gray-100 text-xs whitespace-nowrap";
const bodyCellBase = "border border-gray-300 px-2 py-1 bg-white";
const bodyCellNumber = `${bodyCellBase} text-center text-xs`;
const summaryLabelCell = `${bodyCellBase} text-xs font-semibold text-gray-700`;

function EmptyDateCells({
  dates,
  keyPrefix = "",
  className,
}: {
  dates: PrintDate[];
  keyPrefix?: string;
  className: string;
}) {
  return (
    <>
      {dates.map((d) => (
        <td key={`${keyPrefix}${d.dateKey}`} className={className} />
      ))}
    </>
  );
}

function SummaryRow({
  label,
  dates,
  keyPrefix,
}: {
  label: string;
  dates: PrintDate[];
  keyPrefix: string;
}) {
  return (
    <tr>
      <td className={bodyCellBase}>{/* 왼쪽 여백 열 */}</td>
      <td className={summaryLabelCell}>{label}</td>
      <EmptyDateCells dates={dates} keyPrefix={keyPrefix} className={bodyCellBase} />
      <td className={bodyCellBase}>{/* 여분 열 */}</td>
    </tr>
  );
}

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

  // 새 창이 열려 인쇄용 내용이 준비되면 자동으로 브라우저 인쇄 다이얼로그를 띄움
  useEffect(() => {
    if (!payload) return;

    const timer = setTimeout(() => {
      window.print();
      // 필요하다면 인쇄 후 창을 자동으로 닫을 수 있음:
      // window.close();
    }, 300);

    return () => clearTimeout(timer);
  }, [payload]);

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
                <th className={`${headerCellBase} w-6 text-center font-semibold`}>
                  순
                </th>
                <th className={`${headerCellBase} w-20 text-center`}>이름</th>
                {dates.map((d, index) => {
                  const parts = d.label.split(" ");
                  const dateText = parts[0] ?? "";
                  const periodText = parts.slice(1).join(" ");
                  const session = d.sessionNumber ?? index + 1;
                  return (
                    <th
                      key={d.dateKey}
                      className={`${headerCellBase} text-center`}
                    >
                      <div className="flex flex-col items-center leading-snug space-y-0.5">
                        <span className="font-semibold">{session}차시</span>
                        <span className="text-[10px]">{dateText}</span>
                        <span className="text-[10px] text-gray-600">{periodText}</span>
                      </div>
                    </th>
                  );
                })}
                <th className={`${headerCellBase} text-center w-10`}>
                  계
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, index) => (
                <tr key={s.id}>
                  <td className={bodyCellNumber}>
                    {index + 1}
                  </td>
                  <td className={`${bodyCellBase} whitespace-nowrap`}>
                    <span className="mr-2 text-xs text-gray-500">
                      {s.studentId ?? ""}
                    </span>
                    <span>{s.name ?? s.email ?? "이름 없음"}</span>
                  </td>
                  {dates.map((d) => (
                    <td
                      key={d.dateKey}
                      className={`${bodyCellBase} text-center align-middle`}
                    >
                      {/* 비워 두어 수기로 기입할 수 있게 함 */}
                    </td>
                  ))}
                  <td className={bodyCellBase}>{/* 여분 열 */}</td>
                </tr>
              ))}
              {/* 추가 빈 행: 출석수 / 출석률 */}
              <SummaryRow label="출석수" dates={dates} keyPrefix="extra-count-" />
              <SummaryRow label="출석률" dates={dates} keyPrefix="extra-rate-" />
              <SummaryRow label=" " dates={dates} keyPrefix="extra-rate-" />
              <SummaryRow label=" " dates={dates} keyPrefix="extra-rate-" />
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

