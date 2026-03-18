"use client";

import { useEffect } from "react";
import {
  AttendanceRecordPrintable,
  type AttendanceRecordForPrint,
} from "@/components/dashboard/teacher/AttendanceRecordPrintable";

type PrintPayload = {
  classLabel?: string;
  printedAt?: string;
  records: AttendanceRecordForPrint[];
};

export function AttendanceRecordsPrintClient({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const dataParam = typeof searchParams.data === "string" ? searchParams.data : undefined;

  let payload: PrintPayload | null = null;
  if (dataParam) {
    try {
      const json = decodeURIComponent(dataParam);
      payload = JSON.parse(json) as PrintPayload;
    } catch (err) {
      console.error("Failed to parse attendance print payload", err);
    }
  }

  const records = Array.isArray(payload?.records) ? payload!.records : [];

  useEffect(() => {
    if (records.length === 0) return;
    const timer = setTimeout(() => {
      window.print();
    }, 250);
    return () => clearTimeout(timer);
  }, [records.length]);

  if (!payload || records.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            인쇄할 출결이 없습니다.
          </h1>
          <p className="text-sm text-gray-600">
            출결 목록에서 항목을 선택한 뒤 인쇄를 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="p-6 print:p-0">
        {records.map((r, idx) => (
          <div
            key={r.id ?? idx}
            style={{
              breakAfter: idx === records.length - 1 ? "auto" : "page",
            }}
          >
            <AttendanceRecordPrintable record={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

