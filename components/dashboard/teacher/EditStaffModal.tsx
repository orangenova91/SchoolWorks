"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Select } from "@/components/ui/Select";

export type StaffWithProfile = {
  id: string;
  name: string;
  email: string;
  school: string;
  role: string;
  roleLabel: string;
  major: string;
  classLabel: string;
  grade: string;
  section: string;
  phoneNumber: string;
  createdAt: Date;
};

type EditStaffModalProps = {
  staff: StaffWithProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditStaffModal({ staff, isOpen, onClose, onSuccess }: EditStaffModalProps) {
  const { showToast } = useToastContext();
  const [formData, setFormData] = useState({
    roleLabel: "",
    major: "",
    phoneNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !staff) return;
    
    setFormData({
      roleLabel: staff.roleLabel === "-" ? "" : staff.roleLabel,
      major: staff.major === "-" ? "" : staff.major,
      phoneNumber: staff.phoneNumber === "-" ? "" : staff.phoneNumber,
    });
    setError(null);
  }, [staff, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/teacher/staff/${staff.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleLabel: formData.roleLabel || undefined,
          major: formData.major || undefined,
          phoneNumber: formData.phoneNumber || undefined,
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseBody?.error ??
          "교직원 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      showToast("교직원 정보가 성공적으로 수정되었습니다.", "success");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "교직원 정보 수정 중 오류가 발생했습니다.";
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
          <h2 className="text-lg font-semibold text-gray-900">교직원 정보 편집</h2>
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
            {/* 직책, 이름, 담당 과목/분야 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select
                  label="직책"
                  value={formData.roleLabel || ""}
                  onChange={(e) => handleChange("roleLabel", e.target.value)}
                  disabled={isSaving}
                  options={[
                    { value: "", label: "선택 안 함" },
                    { value: "교사", label: "교사" },
                    { value: "교감", label: "교감" },
                    { value: "교장", label: "교장" },
                    { value: "행정실", label: "행정실" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={staff?.name || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">이름은 편집할 수 없습니다.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당 과목/분야
                </label>
                <input
                  type="text"
                  value={formData.major}
                  onChange={(e) => handleChange("major", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isSaving}
                  placeholder="담당 과목/분야"
                />
              </div>
            </div>

            {/* 이메일, 연락처 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={staff?.email || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">이메일은 편집할 수 없습니다.</p>
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

