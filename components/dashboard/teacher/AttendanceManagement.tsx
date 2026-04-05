"use client";

import { useCallback, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import AttendanceRegistrationForm from "./AttendanceRegistrationForm";
import AttendanceRecordList, { type AttendanceRecord } from "./AttendanceRecordList";
import { useToastContext } from "@/components/providers/ToastProvider";
import { AttendanceRecordsPrintModal } from "./AttendanceRecordsPrintModal";
import { AttendanceRecordStats } from "./AttendanceRecordStats";

type AttendanceManagementProps = {
  hasHomeroom: boolean;
  students?: any[];
  classLabel?: string;
};

export default function AttendanceManagement({
  hasHomeroom,
  students = [],
  classLabel = "",
}: AttendanceManagementProps) {
  const { showToast } = useToastContext();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [recordsForPrint, setRecordsForPrint] = useState<AttendanceRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const selectedCount = selectedIds.size;

  const handleListLoadingChange = useCallback((loading: boolean) => {
    setListLoading(loading);
  }, []);

  const selectedRecords = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const idSet = selectedIds;
    return recordsForPrint.filter((r) => idSet.has(r.id));
  }, [recordsForPrint, selectedIds]);

  const onToggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onToggleAllSelected = useCallback((ids: string[], nextChecked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (nextChecked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const onRecordsLoaded = useCallback((records: AttendanceRecord[]) => {
    setRecordsForPrint(records);
    const ids = new Set(records.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, []);

  const handlePrintSelected = useCallback(() => {
    if (selectedRecords.length === 0) {
      showToast("인쇄할 출결을 먼저 선택해주세요.", "error");
      return;
    }
    setIsPrintOpen(true);
  }, [selectedRecords.length, showToast]);

  const handleMonthChange = useCallback((nextMonth: string) => {
    setSelectedMonth(nextMonth);
    setSelectedIds(new Set());
    setRecordsForPrint([]);
    setIsPrintOpen(false);
    setListLoading(true);
  }, []);

  if (!hasHomeroom) {
    return (
      <div className="text-sm text-gray-600">
        <p>담임반 정보가 없습니다. 담임반을 먼저 설정해주세요.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex min-h-0 flex-1 gap-6">
      <div className="flex-1 shrink-0 overflow-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">학생 출결 등록</h3>
        <AttendanceRegistrationForm
          students={students}
          onSuccess={() => setRefreshTrigger((n) => n + 1)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">출결 목록</h3>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.currentTarget.value)}
              aria-label="월 선택"
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handlePrintSelected}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={selectedCount === 0 ? "선택한 출결이 없습니다." : "선택 항목 인쇄"}
          >
            <Printer className="h-4 w-4" />
            인쇄{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <AttendanceRecordList
            classLabel={classLabel}
            month={selectedMonth}
            refreshTrigger={refreshTrigger}
            selectedIds={selectedIds}
            onToggleSelected={onToggleSelected}
            onToggleAllSelected={onToggleAllSelected}
            onRecordsLoaded={onRecordsLoaded}
            onLoadingChange={handleListLoadingChange}
          />
        </div>
      </div>
      </div>

      <AttendanceRecordStats
        records={recordsForPrint}
        monthKey={selectedMonth}
        isLoading={listLoading}
      />
      </div>

      <AttendanceRecordsPrintModal
        records={selectedRecords}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />
    </>
  );
}
