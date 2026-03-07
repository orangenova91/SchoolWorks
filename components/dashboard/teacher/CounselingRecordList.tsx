"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { useToastContext } from "@/components/providers/ToastProvider";
import CounselingRecordDetailModal from "./CounselingRecordDetailModal";
import CounselingRecordEditModal from "./CounselingRecordEditModal";

export type CounselingRecordItem = {
  id: string;
  studentId: string;
  studentName: string | null;
  studentNumber: string | null;
  counseledAt: string;
  type: string | null;
  summary: string | null;
  content: string;
  isPrivate: boolean;
  attachments: string | null;
  createdAt: string;
};

type CounselingRecordListProps = {
  classLabel: string;
  refreshTrigger?: number;
};

function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

export default function CounselingRecordList({
  classLabel,
  refreshTrigger = 0,
}: CounselingRecordListProps) {
  const { showToast } = useToastContext();
  const [records, setRecords] = useState<CounselingRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<CounselingRecordItem | null>(null);
  const [editingRecord, setEditingRecord] = useState<CounselingRecordItem | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/teacher/counseling-records?classLabel=${encodeURIComponent(classLabel)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "목록을 불러오지 못했습니다.");
      }
      setRecords(data.records ?? []);
    } catch (err: any) {
      showToast(err.message ?? "목록을 불러오지 못했습니다.", "error");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [classLabel, showToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, refreshTrigger]);

  const handleDelete = async (r: CounselingRecordItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 상담기록을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/teacher/counseling-records/${r.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      showToast("상담기록이 삭제되었습니다.", "success");
      fetchRecords();
      if (selectedRecord?.id === r.id) setSelectedRecord(null);
      if (editingRecord?.id === r.id) setEditingRecord(null);
    } catch (err: any) {
      showToast(err.message ?? "삭제에 실패했습니다.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-gray-500">
        <p>상담기록 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-gray-500">
        <p>등록된 상담기록이 없습니다.</p>
        <p className="mt-1 text-sm">왼쪽에서 상담기록을 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="w-[90px] px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                상담일시
              </th>
              <th className="w-[100px] px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                학생
              </th>
              <th className="w-[70px] px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                유형
              </th>
              <th className="min-w-0 flex-1 px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                요약
              </th>
              <th className="w-[80px] px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {records.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => setSelectedRecord(r)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {formatDateShort(r.counseledAt)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium text-gray-900">
                    {r.studentName ?? "-"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.studentNumber ?? ""}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {r.type ?? "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <span className="line-clamp-2 block">
                    {r.summary || (r.content.length > 50 ? `${r.content.slice(0, 50)}…` : r.content) || "-"}
                  </span>
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRecord(r);
                      }}
                      className="rounded p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      title="편집"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(r, e)}
                      className="rounded p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
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
            <CounselingRecordDetailModal
              record={selectedRecord}
              isOpen={!!selectedRecord}
              onClose={() => setSelectedRecord(null)}
              onEdit={() => {
                if (selectedRecord) setEditingRecord(selectedRecord);
                setSelectedRecord(null);
              }}
              onDelete={() => {
                if (selectedRecord) handleDelete(selectedRecord, {} as React.MouseEvent);
                setSelectedRecord(null);
              }}
              onUpdated={fetchRecords}
            />
            <CounselingRecordEditModal
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
