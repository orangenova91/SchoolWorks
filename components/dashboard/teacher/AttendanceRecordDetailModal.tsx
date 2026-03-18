"use client";

import { useEffect } from "react";
import { X, Printer } from "lucide-react";
import {
  AttendanceRecordPrintable,
  type AttendanceRecordForPrint,
} from "./AttendanceRecordPrintable";

export type AttendanceRecordForModal = AttendanceRecordForPrint;

type AttendanceRecordDetailModalProps = {
  record: AttendanceRecordForModal | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function AttendanceRecordDetailModal({
  record,
  isOpen,
  onClose,
}: AttendanceRecordDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("attendance-print-active");
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("attendance-print-active");
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const wideLayout =
    record &&
    [
      "결석 (질병)",
      "결석 (인정)",
      "결석 (기타)",
      "질병",
      "인정",
      "기타",
      "조퇴",
      "지각",
      "결과",
    ].includes(record.type);

  return (
    <div
      id="attendance-record-print"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:relative print:inset-auto print:block print:min-h-0 print:bg-white"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto m-4 print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:m-0 ${
          wideLayout ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-semibold text-gray-900">출결 상세</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none"
              title="인쇄"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {record ? (
          <AttendanceRecordPrintable record={record} />
        ) : (
          <div className="p-6 text-center text-gray-500">데이터를 불러올 수 없습니다.</div>
        )}
      </div>
    </div>
  );
}
