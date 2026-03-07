"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StudentAutocomplete } from "@/components/dashboard/StudentAutocomplete";

const COUNSELING_TYPES = [
  { value: "학습", label: "학습" },
  { value: "생활", label: "생활" },
  { value: "진로", label: "진로" },
  { value: "학부모", label: "학부모" },
  { value: "기타", label: "기타" },
];

type StudentOption = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  classLabel: string | null;
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

type CounselingRecordFormProps = {
  students: any[];
  onSuccess?: () => void;
};

export default function CounselingRecordForm({
  students,
  onSuccess,
}: CounselingRecordFormProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [studentId, setStudentId] = useState("");
  const [counseledAt, setCounseledAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [type, setType] = useState("학습");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const options = toStudentOptions(students);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      showToast("학생을 선택해주세요.", "error");
      return;
    }
    if (!content.trim()) {
      showToast("상담 내용을 입력해주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teacher/counseling-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          counseledAt: new Date(counseledAt).toISOString(),
          type,
          summary: summary.trim() || undefined,
          content: content.trim(),
          isPrivate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "등록에 실패했습니다.");
      }
      showToast("상담기록이 등록되었습니다.", "success");
      setStudentId("");
      setCounseledAt(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      });
      setType("학습");
      setSummary("");
      setContent("");
      setIsPrivate(false);
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
        <label className="mb-1 block text-sm font-medium text-gray-700">
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

      <Input
        label="상담 일시"
        type="datetime-local"
        value={counseledAt}
        onChange={(e) => setCounseledAt(e.target.value)}
        required
      />

      <Select
        label="상담 유형"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={COUNSELING_TYPES}
      />

      <Input
        label="요약 (선택)"
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="한 줄 요약"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          상담 내용 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="상담 내용을 입력하세요"
          required
          rows={5}
          className="flex w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">비공개 (다른 교사에게 보이지 않음)</span>
      </label>

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        상담기록 등록
      </Button>
    </form>
  );
}
