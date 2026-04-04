"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  isShortPeriodType,
  todayLocalYmd,
  addOneDaySkipWeekendYmd,
  toLocalDateInputValue,
} from "@/lib/attendanceWrittenDate";

const ATTENDANCE_TYPES = [
  { value: "결석 (질병)", label: "결석 (질병)" },
  { value: "결석 (인정)", label: "결석 (인정)" },
  { value: "결석 (기타)", label: "결석 (기타)" },
  { value: "조퇴", label: "조퇴" },
  { value: "지각", label: "지각" },
  { value: "결과", label: "결과" },
];

// 기존 DB 데이터("질병" 등)를 새 값("결석 (질병)" 등)으로 매핑
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

const PERIOD_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}교시`,
}));

type AttendanceRecordForEdit = {
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
};

type AttendanceRecordEditModalProps = {
  record: AttendanceRecordForEdit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AttendanceRecordEditModal({
  record,
  isOpen,
  onClose,
  onSuccess,
}: AttendanceRecordEditModalProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [type, setType] = useState("결석 (질병)");
  const [reason, setReason] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [period, setPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [writtenAt, setWrittenAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !record) return;
    setType(TYPE_LABELS[record.type] ?? record.type);
    setReason(record.reason ?? "");
    setPeriodFrom(record.periodFrom ?? "");
    setPeriodTo(record.periodTo ?? "");
    setPeriod(record.period ?? "");
    setStartDate(toLocalDateInputValue(record.startDate));
    setEndDate(toLocalDateInputValue(record.endDate));
  }, [isOpen, record]);

  useEffect(() => {
    if (!isOpen || !record) return;
    if (isShortPeriodType(type)) {
      setWrittenAt(startDate ? addOneDaySkipWeekendYmd(startDate) : todayLocalYmd());
    } else {
      setWrittenAt(endDate ? addOneDaySkipWeekendYmd(endDate) : todayLocalYmd());
    }
  }, [isOpen, record, type, startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!reason.trim()) {
      showToast("출결 사유를 입력해주세요.", "error");
      return;
    }
    if (!startDate || !writtenAt) {
      showToast("시작 일자와 작성 일자를 입력해주세요.", "error");
      return;
    }
    if (type === "조퇴" && !periodFrom) {
      showToast("교시(부터)를 선택해주세요.", "error");
      return;
    }
    if (type === "지각" && !periodTo) {
      showToast("교시(까지)를 선택해주세요.", "error");
      return;
    }
    if (type === "결과" && !period.trim()) {
      showToast("교시를 입력해주세요.", "error");
      return;
    }
    if (type !== "조퇴" && type !== "지각" && type !== "결과" && !endDate) {
      showToast("종료 일자를 입력해주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/teacher/homeroom-attendance/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          reason: reason.trim(),
          periodFrom: type === "조퇴" ? periodFrom : undefined,
          periodTo: type === "지각" ? periodTo : undefined,
          period: type === "결과" ? period.trim() || undefined : undefined,
          startDate,
          endDate: type === "조퇴" || type === "지각" || type === "결과" ? startDate : endDate,
          writtenAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "수정에 실패했습니다.");
      }
      showToast("출결이 수정되었습니다.", "success");
      router.refresh();
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message ?? "수정에 실패했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">출결 수정</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {record && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                {record.studentName ?? "-"}
              </p>
              <p className="text-xs text-gray-500">{record.studentNumber ?? ""}</p>
            </div>

            <Select
              label="출결 종류"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={ATTENDANCE_TYPES}
              required
            />

            <Input
              label="출결 사유"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="출결 사유를 입력하세요"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="시작 일자"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={type !== "조퇴" && type !== "지각" && type !== "결과" ? endDate || undefined : undefined}
                required
              />
              {type === "조퇴" ? (
                <Select
                  label="교시(부터)"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  options={PERIOD_OPTIONS}
                  placeholder="선택"
                  required
                />
              ) : type === "지각" ? (
                <Select
                  label="교시(까지)"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  options={PERIOD_OPTIONS}
                  placeholder="선택"
                  required
                />
              ) : type === "결과" ? (
                <Input
                  label="교시"
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="ex) 3 or 3~4"
                  required
                />
              ) : (
                <Input
                  label="종료 일자"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  required
                />
              )}
              <Input
                label="작성 일자"
                type="date"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                저장
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
