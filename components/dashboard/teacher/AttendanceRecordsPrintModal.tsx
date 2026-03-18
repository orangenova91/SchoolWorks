"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  AttendanceRecordPrintable,
  type AttendanceRecordForPrint,
} from "./AttendanceRecordPrintable";

export function AttendanceRecordsPrintModal({
  records,
  isOpen,
  onClose,
}: {
  records: AttendanceRecordForPrint[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const safeRecords = useMemo(
    () => (Array.isArray(records) ? records.filter(Boolean) : []),
    [records]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("attendance-print-active");
    return () => {
      document.body.classList.remove("attendance-print-active");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (safeRecords.length === 0) return;

    const timer = setTimeout(() => {
      window.print();
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, safeRecords.length]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      id="attendance-records-print"
      className="fixed inset-0 z-50 bg-black/50 print:bg-white print:relative print:inset-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-xl print:shadow-none print:rounded-none print:my-0 print:max-w-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 print:hidden">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">출결 인쇄</h2>
            <p className="mt-1 text-sm text-gray-600">
              선택된 {safeRecords.length}건이 연속으로 인쇄됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
            title="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-4 print:max-h-none print:overflow-visible print:p-0">
          {safeRecords.map((r, idx) => (
            <div
              key={r.id ?? idx}
              style={{ breakAfter: idx === safeRecords.length - 1 ? "auto" : "page" }}
              className="print:break-after-page"
            >
              <AttendanceRecordPrintable record={r} />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

