"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useToastContext } from "@/components/providers/ToastProvider";

export type StudentWithProfile = {
  id: string;
  name: string;
  email: string;
  school: string;
  studentId: string;
  grade: string;
  classLabel: string;
  section: string;
  sex: string;
  phoneNumber: string;
  createdAt: Date;
};

type EditStudentModalProps = {
  student: StudentWithProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditStudentModal({ student, isOpen, onClose, onSuccess }: EditStudentModalProps) {
  const { showToast } = useToastContext();
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    sex: "",
    phoneNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !student) return;
    
    setFormData({
      studentId: student.studentId === "-" ? "" : student.studentId,
      name: student.name || "",
      sex: student.sex === "-" ? "" : student.sex,
      phoneNumber: student.phoneNumber === "-" ? "" : student.phoneNumber,
    });
    setError(null);
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/teacher/students/${student.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: formData.studentId || undefined,
          name: formData.name || undefined,
          sex: formData.sex || undefined,
          phoneNumber: formData.phoneNumber || undefined,
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseBody?.error ??
          "학생 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      showToast("학생 정보가 성공적으로 수정되었습니다.", "success");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "학생 정보 수정 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">학생 정보 편집</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            disabled={isSaving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* 이메일 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={student?.email || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                disabled
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">이메일은 편집할 수 없습니다.</p>
            </div>

            {/* 학번, 이름 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  학번
                </label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => handleChange("studentId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isSaving}
                  placeholder="학번"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isSaving}
                  placeholder="이름"
                />
              </div>
            </div>

            {/* 성별, 연락처 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  성별
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) => handleChange("sex", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  disabled={isSaving}
                >
                  <option value="">선택</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연락처
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isSaving}
                  placeholder="연락처"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

