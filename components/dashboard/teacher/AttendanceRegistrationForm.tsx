"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { StudentAutocomplete } from "@/components/dashboard/StudentAutocomplete";

const ATTENDANCE_TYPES = [
  { value: "결석 (질병)", label: "결석 (질병)" },
  { value: "결석 (인정)", label: "결석 (인정)" },
  { value: "결석 (기타)", label: "결석 (기타)" },
  { value: "조퇴", label: "조퇴" },
  { value: "지각", label: "지각" },
  { value: "결과", label: "결과" },
];

const PERIOD_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}교시`,
}));

type StudentOption = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  classLabel: string | null;
};

type AttendanceRegistrationFormProps = {
  students: StudentOption[];
  onSuccess?: () => void;
};

function toStudentOptions(students: any[]): StudentOption[] {
  return students.map((s) => ({
    id: s.id,
    name: s.name ?? "",
    email: s.email ?? "",
    studentId: s.studentProfile?.studentId ?? null,
    classLabel: s.studentProfile?.classLabel ?? null,
  }));
}

export default function AttendanceRegistrationForm({
  students,
  onSuccess,
}: AttendanceRegistrationFormProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("결석 (질병)");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [period, setPeriod] = useState("");
  const [writtenAt, setWrittenAt] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [studentSign, setStudentSign] = useState<string | null>(null);
  const [guardianSign, setGuardianSign] = useState<string | null>(null);
  const [teacherSign, setTeacherSign] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<{ name: string; dataUrl: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const newFiles: { name: string; dataUrl: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_SIZE) {
        showToast(`${file.name}은(는) 10MB 이하여야 합니다.`, "error");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newFiles.push({ name: file.name, dataUrl });
      } catch {
        showToast(`${file.name} 읽기 실패`, "error");
      }
    }
    setAttachmentFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const options = toStudentOptions(students);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      showToast("학생을 선택해주세요.", "error");
      return;
    }
    if (!reason.trim()) {
      showToast("출결 사유를 입력해주세요.", "error");
      return;
    }
    if (!startDate || !writtenAt) {
      showToast("시작 일자와 작성 일자를 입력해주세요.", "error");
      return;
    }
    if (type !== "조퇴" && type !== "지각" && type !== "결과" && !endDate) {
      showToast("종료 일자를 입력해주세요.", "error");
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

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teacher/homeroom-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          type,
          reason: reason.trim(),
          periodFrom: type === "조퇴" ? periodFrom : undefined,
          periodTo: type === "지각" ? periodTo : undefined,
          period: type === "결과" ? period.trim() : undefined,
          startDate,
          endDate: type === "조퇴" || type === "지각" || type === "결과" ? startDate : endDate,
          writtenAt,
          studentSignImage: studentSign || undefined,
          guardianSignImage: guardianSign || undefined,
          teacherSignImage: teacherSign || undefined,
          attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "등록에 실패했습니다.");
      }
      showToast("출결이 등록되었습니다.", "success");
      setStudentId("");
      setType("결석 (질병)");
      setReason("");
      setStartDate("");
      setEndDate("");
      setPeriodFrom("");
      setPeriodTo("");
      setPeriod("");
      setWrittenAt(new Date().toISOString().slice(0, 10));
      setStudentSign(null);
      setGuardianSign(null);
      setTeacherSign(null);
      setAttachmentFiles([]);
      router.refresh();
      onSuccess?.();
    } catch (err: any) {
      showToast(err.message ?? "등록에 실패했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          학생 <span className="text-red-500">*</span>
        </label>
        <StudentAutocomplete
          value={studentId}
          onChange={setStudentId}
          students={options}
          disabledStudentIds={[]}
          placeholder="학생 선택"
        />
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          첨부 파일 (선택)
        </label>
        <input
          type="file"
          multiple
          onChange={handleAttachmentChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.zip"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {attachmentFiles.length > 0 && (
          <ul className="mt-2 space-y-1">
            {attachmentFiles.map((f, idx) => (
              <li
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
              >
                <span className="truncate text-gray-700">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="ml-2 shrink-0 text-xs text-red-600 hover:text-red-700"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-gray-500">
         진단서, 진료확인서, 처방전, 처방약봉지, 입퇴원확인서 등 (파일당 최대 10MB)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SignaturePad
          label="학생 서명"
          value={studentSign}
          onChange={setStudentSign}
          height={120}
        />
        <SignaturePad
          label="보호자 서명"
          value={guardianSign}
          onChange={setGuardianSign}
          height={120}
        />
        <SignaturePad
          label="교사 서명"
          value={teacherSign}
          onChange={setTeacherSign}
          height={120}
        />
      </div>

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        출결 등록
      </Button>
    </form>
  );
}
