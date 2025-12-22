"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Trash2 } from "lucide-react";
import type { UsersTableRow } from "./UsersTable";

type EditUserModalProps = {
  user: UsersTableRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminSchool?: string;
};

export function EditUserModal({ user, isOpen, onClose, onSuccess, adminSchool }: EditUserModalProps) {
  const isCreateMode = user === null;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    school: "",
    role: "",
    password: "",
    studentId: "",
    grade: "",
    className: "",
    childEmails: "", // 학부모의 자녀 이메일 (쉼표로 구분)
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [childStudents, setChildStudents] = useState<Array<{ id: string; name: string; email: string; studentId: string | null }>>([]);

  useEffect(() => {
    if (!isOpen) return; // 모달이 닫혀있으면 실행하지 않음
    
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        school: user.school || "",
        role: user.role || "",
        password: "", // 편집 모드에서는 비밀번호를 표시하지 않음
        studentId: user.studentId || "",
        grade: user.grade || "",
        className: user.className || "",
        childEmails: "", // 초기값은 빈 문자열, API에서 가져옴
      });
      setError(null);
      
      // 학부모 역할인 경우 자녀 학생 정보 가져오기
      if (user.role === "parent" && user.id) {
        fetchChildStudents(user.id);
      } else {
        setChildStudents([]);
      }
    } else {
      // 등록 모드일 때 폼 초기화 (관리자 학교 정보 자동 입력)
      setFormData({
        name: "",
        email: "",
        school: adminSchool || "",
        role: "",
        password: "",
        studentId: "",
        grade: "",
        className: "",
        childEmails: "",
      });
      setError(null);
      setChildStudents([]);
    }
  }, [user, isOpen, adminSchool]);

  const fetchChildStudents = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.parentProfile?.studentIds && data.parentProfile.studentIds.length > 0) {
          // studentIds로 학생 정보 가져오기
          const studentsResponse = await fetch(`/api/admin/users/students?ids=${data.parentProfile.studentIds.join(",")}`);
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            setChildStudents(studentsData.students || []);
            // 이메일 목록을 쉼표로 구분하여 설정
            const emails = (studentsData.students || []).map((s: any) => s.email).join(", ");
            setFormData((prev) => ({ ...prev, childEmails: emails }));
          }
        } else {
          setChildStudents([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch child students:", error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const endpoint = isCreateMode
        ? "/api/admin/users/create"
        : `/api/admin/users/${user!.id}`;
      const method = isCreateMode ? "POST" : "PATCH";

      // 등록 모드일 때는 password를 포함, 편집 모드일 때는 제외
      // 편집 모드에서는 email과 school은 변경하지 않음
      const requestBody = isCreateMode
        ? formData
        : {
            name: formData.name,
            role: formData.role,
            studentId: formData.studentId,
            grade: formData.grade,
            className: formData.className,
            childEmails: formData.childEmails, // 학부모의 자녀 이메일
            // email과 school은 편집 모드에서 제외 (변경 불가)
          };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || (isCreateMode ? "사용자 등록에 실패했습니다." : "사용자 정보 업데이트에 실패했습니다."));
      }
    } catch (err) {
      setError(isCreateMode ? "사용자 등록 중 오류가 발생했습니다." : "사용자 정보 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || "사용자 삭제에 실패했습니다.");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setError("사용자 삭제 중 오류가 발생했습니다.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isCreateMode ? "새 사용자 등록" : "사용자 정보 편집"}
          </h2>
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* 첫 번째 줄: 학교/조직, 역할 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학교/조직</label>
                <input
                  type="text"
                  value={formData.school}
                  onChange={(e) => handleChange("school", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-gray-100"
                  disabled={true}
                  readOnly={true}
                />
                {isCreateMode && adminSchool && (
                  <p className="text-xs text-gray-500 mt-1">
                    관리자 계정의 학교 정보가 자동으로 설정되었습니다.
                  </p>
                )}
                {!isCreateMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    학교/조직은 편집할 수 없습니다.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  역할 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  required={isCreateMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isSaving}
                >
                  <option value="">선택 안 함</option>
                  <option value="student">학생</option>
                  <option value="teacher">교사</option>
                  <option value="admin">관리자</option>
                  <option value="parent">학부모</option>
                </select>
              </div>
            </div>

            {/* 두 번째 줄: 이메일, 비밀번호 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-gray-100"
                  disabled={true}
                  readOnly={true}
                />
                {!isCreateMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    이메일은 편집할 수 없습니다.
                  </p>
                )}
              </div>

              {isCreateMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="비워두면 기본 비밀번호(abcd1234!@) 사용"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    비워두면 기본 비밀번호(abcd1234!@)가 사용됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* 세 번째 줄: 학번, 이름 (학생 역할일 때만) */}
            {formData.role === "student" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학번</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => handleChange("studentId", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    학번을 입력하면 학년과 학반이 자동으로 생성됩니다.
                  </p>
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
                  />
                </div>
              </div>
            ) : (
              <>
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
                  />
                </div>
                {/* 학부모 역할일 때 자녀 학생 정보 표시 */}
                {formData.role === "parent" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      자녀 학생 이메일
                    </label>
                    <input
                      type="text"
                      value={formData.childEmails}
                      onChange={(e) => handleChange("childEmails", e.target.value)}
                      placeholder="쉼표로 구분하여 입력 (예: student1@example.com, student2@example.com)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      자녀 학생의 이메일을 쉼표로 구분하여 입력하세요.
                    </p>
                    {childStudents.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-medium text-gray-700 mb-2">연결된 자녀 학생:</p>
                        <ul className="space-y-1">
                          {childStudents.map((student) => (
                            <li key={student.id} className="text-xs text-gray-600">
                              • {student.studentId ? `${student.studentId} ` : ""}{student.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {!isCreateMode && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            )}
            {isCreateMode && <div />}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Save className="w-4 h-4" />
                {isSaving
                  ? isCreateMode
                    ? "등록 중..."
                    : "저장 중..."
                  : isCreateMode
                  ? "등록"
                  : "저장"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    사용자 삭제 확인
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    정말로 <span className="font-semibold">{user?.name || user?.email}</span> 사용자를 삭제하시겠습니까?
                    <br />
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

