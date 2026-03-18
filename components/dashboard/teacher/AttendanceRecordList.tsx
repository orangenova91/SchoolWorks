"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { useToastContext } from "@/components/providers/ToastProvider";
import AttendanceRecordDetailModal, {
  type AttendanceRecordForModal,
} from "./AttendanceRecordDetailModal";
import AttendanceRecordEditModal from "./AttendanceRecordEditModal";

export type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string | null;
  studentNumber: string | null;
  type: string;
  reason: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  period: string | null;
  startDate: string;
  endDate: string;
  writtenAt: string;
  studentSignUrl: string | null;
  guardianSignUrl: string | null;
  teacherSignUrl: string | null;
  attachments: string | null;
  teacherName?: string | null;
  school?: string | null;
  createdAt: string;
};

type AttendanceRecordListProps = {
  classLabel: string;
  refreshTrigger?: number;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onToggleAllSelected: (ids: string[], nextChecked: boolean) => void;
  onRecordsLoaded?: (records: AttendanceRecord[]) => void;
};

// 기존 DB 데이터("질병" 등) 및 새 데이터("결석 (질병)" 등) 모두 올바르게 표시
const TYPE_LABELS: Record<string, string> = {
  질병: "결석 (질병)",
  인정: "결석 (인정)",
  기타: "결석 (기타)",
  "결석 (질병)": "결석 (질병)",
  "결석 (인정)": "결석 (인정)",
  "결석 (기타)": "결석 (기타)",
  조퇴: "조퇴",
  지각: "지각",
  결과: "결과",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default function AttendanceRecordList({
  classLabel,
  refreshTrigger = 0,
  selectedIds,
  onToggleSelected,
  onToggleAllSelected,
  onRecordsLoaded,
}: AttendanceRecordListProps) {
  const { showToast } = useToastContext();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [mounted, setMounted] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/teacher/homeroom-attendance?classLabel=${encodeURIComponent(classLabel)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "목록을 불러오지 못했습니다.");
      }
      const nextRecords = (data.records ?? []) as AttendanceRecord[];
      setRecords(nextRecords);
      onRecordsLoaded?.(nextRecords);
    } catch (err: any) {
      showToast(err.message ?? "목록을 불러오지 못했습니다.", "error");
      setRecords([]);
      onRecordsLoaded?.([]);
    } finally {
      setIsLoading(false);
    }
  }, [classLabel, showToast, onRecordsLoaded]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, refreshTrigger]);

  const handleDelete = async (r: AttendanceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 출결 기록을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/teacher/homeroom-attendance/${r.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      showToast("출결이 삭제되었습니다.", "success");
      fetchRecords();
    } catch (err: any) {
      showToast(err.message ?? "삭제에 실패했습니다.", "error");
    }
  };

  const getPeriodNumber = (r: AttendanceRecord): number => {
    const raw =
      r.type === "조퇴"
        ? r.periodFrom
        : r.type === "지각"
          ? r.periodTo
          : r.type === "결과"
            ? r.period
            : null;
    if (!raw) return 0;
    const m = String(raw).match(/\d+/);
    return m ? Number(m[0]) : 0;
  };

  const sortedRecords = [...records].sort((a, b) => {
    const aStart = new Date(a.startDate).getTime();
    const bStart = new Date(b.startDate).getTime();
    if (aStart !== bStart) return aStart - bStart;

    const aPeriod = getPeriodNumber(a);
    const bPeriod = getPeriodNumber(b);
    if (aPeriod !== bPeriod) return aPeriod - bPeriod;

    const aEnd = new Date(a.endDate).getTime();
    const bEnd = new Date(b.endDate).getTime();
    if (aEnd !== bEnd) return aEnd - bEnd;

    const aWritten = new Date(a.writtenAt).getTime();
    const bWritten = new Date(b.writtenAt).getTime();
    if (aWritten !== bWritten) return aWritten - bWritten;

    return String(a.id).localeCompare(String(b.id));
  });

  const recordIds = sortedRecords.map((r) => r.id);
  const allSelected =
    recordIds.length > 0 && recordIds.every((id) => selectedIds.has(id));
  const someSelected = recordIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = !allSelected && someSelected;
  }, [allSelected, someSelected]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-gray-500">
        <p>출결 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-gray-500">
        <p>등록된 출결이 없습니다.</p>
        <p className="mt-1 text-sm">왼쪽에서 출결을 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-10 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    onToggleAllSelected(recordIds, e.currentTarget.checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                  aria-label="전체 선택"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="w-[80px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                학생
              </th>
              <th className="w-[80px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                종류
              </th>
              <th className="w-[100px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                기간
              </th>
              <th className="w-40 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                작성일
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRecords.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedRecord(r)}
              >
                <td
                  className="w-10 px-3 py-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => onToggleSelected(r.id)}
                    aria-label={`${r.studentName ?? "학생"} 선택`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="w-[80px] px-4 py-3 text-sm">
                  <div className="font-medium text-gray-900 whitespace-nowrap">
                    {r.studentName ?? "-"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.studentNumber ?? ""}
                  </div>
                </td>
                <td className="w-[80px] px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {TYPE_LABELS[r.type] ?? r.type}
                </td>
                <td className="w-[100px] px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {r.type === "조퇴" && r.periodFrom
                    ? `${formatDateShort(r.startDate)} (${r.periodFrom}교시~)`
                    : r.type === "지각" && r.periodTo
                      ? `${formatDateShort(r.startDate)} (~${r.periodTo}교시)`
                      : r.type === "결과" && r.period
                        ? `${formatDateShort(r.startDate)} (${r.period})`
                        : `${formatDateShort(r.startDate)} ~ ${formatDateShort(r.endDate)}`}
                </td>
                <td className="w-40 px-4 py-3 text-sm text-gray-700">
                  {formatDateShort(r.writtenAt)}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRecord(r);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="편집"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(r, e)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <AttendanceRecordDetailModal
              record={selectedRecord as AttendanceRecordForModal | null}
              isOpen={!!selectedRecord}
              onClose={() => setSelectedRecord(null)}
            />
            <AttendanceRecordEditModal
              record={editingRecord}
              isOpen={!!editingRecord}
              onClose={() => setEditingRecord(null)}
              onSuccess={() => {
                fetchRecords();
                setEditingRecord(null);
              }}
            />
          </>,
          document.body
        )}
    </div>
  );
}
