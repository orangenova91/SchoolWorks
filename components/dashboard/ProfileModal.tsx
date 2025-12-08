"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { User, Mail, Building2, Shield, MapPin, Calendar, Clock, X, Edit2, Save, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  school?: string | null;
  region?: string | null;
  role?: string | null;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  studentProfile?: any;
  teacherProfile?: any;
  adminProfile?: {
    phoneNumber?: string | null;
    notes?: string | null;
    school?: {
      name: string;
      schoolType: string;
      contactName: string;
      contactPhone: string;
    } | null;
  } | null;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isEditingTeacherProfile, setIsEditingTeacherProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [classLabels, setClassLabels] = useState<string[]>([]);
  
  // 교사 프로필 수정용 상태
  const [teacherFormData, setTeacherFormData] = useState({
    major: "",
    classLabel: "",
    phoneNumber: "",
    club: "",
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      fetchClassLabels();
      setIsEditingTeacherProfile(false);
    }
  }, [isOpen]);

  // 교사 프로필 데이터가 로드되면 폼 데이터 초기화
  useEffect(() => {
    if (user?.teacherProfile) {
      setTeacherFormData({
        major: user.teacherProfile.major || "",
        classLabel: user.teacherProfile.classLabel || "",
        phoneNumber: user.teacherProfile.phoneNumber || "",
        club: user.teacherProfile.club || "",
      });
    }
  }, [user?.teacherProfile]);

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        throw new Error("프로필을 불러오는데 실패했습니다.");
      }
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassLabels = async () => {
    try {
      const response = await fetch("/api/user/class-labels");
      if (!response.ok) {
        throw new Error("학반 목록을 불러오는데 실패했습니다.");
      }
      const data = await response.json();
      setClassLabels(data.classLabels || []);
    } catch (err) {
      console.error("Failed to fetch class labels:", err);
      // 에러가 발생해도 계속 진행 (빈 배열로 설정)
      setClassLabels([]);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleLabel = (role: string | null | undefined) => {
    switch (role) {
      case "student":
        return "학생";
      case "teacher":
        return "교사";
      case "admin":
        return "관리자";
      case "superadmin":
        return "슈퍼관리자";
      default:
        return role || "-";
    }
  };

  const handleEditTeacherProfile = () => {
    setIsEditingTeacherProfile(true);
  };

  const handleCancelEdit = () => {
    // 원래 데이터로 복원
    if (user?.teacherProfile) {
      setTeacherFormData({
        major: user.teacherProfile.major || "",
        classLabel: user.teacherProfile.classLabel || "",
        phoneNumber: user.teacherProfile.phoneNumber || "",
        club: user.teacherProfile.club || "",
      });
    }
    setIsEditingTeacherProfile(false);
  };

  const handleSaveTeacherProfile = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teacherFormData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "프로필 업데이트에 실패했습니다.");
      }

      const data = await response.json();
      setUser(data.user);
      setIsEditingTeacherProfile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full my-auto max-h-[90vh] overflow-hidden flex flex-col z-[100]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">프로필 정보</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  기본 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">이름</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.name || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">이메일</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">학교</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.school || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">역할</p>
                      <p className="text-base font-medium text-gray-900">
                        {getRoleLabel(user.role)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">지역</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.region || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">계정 생성일</p>
                      <p className="text-base font-medium text-gray-900">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">최종 수정일</p>
                      <p className="text-base font-medium text-gray-900">
                        {formatDateTime(user.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Mail className={cn("w-5 h-5 mt-0.5", user.emailVerified ? "text-green-500" : "text-gray-400")} />
                    <div>
                      <p className="text-sm text-gray-500">이메일 인증</p>
                      <p className={cn("text-base font-medium", user.emailVerified ? "text-green-600" : "text-gray-900")}>
                        {user.emailVerified ? `인증 완료 (${formatDate(user.emailVerified)})` : "미인증"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 학생 프로필 정보 */}
              {user.studentProfile && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    학생 프로필 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">학번</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.studentId || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">학년</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.grade || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">반</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.classLabel || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">구분</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.section || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">전공</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.major || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">전화번호</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.phoneNumber || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">동아리</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.studentProfile.club || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 교사 프로필 정보 */}
              {user.teacherProfile && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      교사 프로필 정보
                    </h3>
                    {!isEditingTeacherProfile && (
                      <button
                        onClick={handleEditTeacherProfile}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>수정</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">직책</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.teacherProfile.roleLabel || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당 과목</p>
                      {isEditingTeacherProfile ? (
                        <input
                          type="text"
                          value={teacherFormData.major}
                          onChange={(e) =>
                            setTeacherFormData({ ...teacherFormData, major: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="담당 과목을 입력하세요"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900">
                          {user.teacherProfile.major || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당 반</p>
                      {isEditingTeacherProfile ? (
                        <select
                          value={teacherFormData.classLabel}
                          onChange={(e) =>
                            setTeacherFormData({ ...teacherFormData, classLabel: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">선택하세요</option>
                          {classLabels.map((label) => (
                            <option key={label} value={label}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-base font-medium text-gray-900">
                          {user.teacherProfile.classLabel || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">전화번호</p>
                      {isEditingTeacherProfile ? (
                        <input
                          type="tel"
                          value={teacherFormData.phoneNumber}
                          onChange={(e) =>
                            setTeacherFormData({ ...teacherFormData, phoneNumber: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="전화번호를 입력하세요"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900">
                          {user.teacherProfile.phoneNumber || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당 동아리</p>
                      {isEditingTeacherProfile ? (
                        <input
                          type="text"
                          value={teacherFormData.club}
                          onChange={(e) =>
                            setTeacherFormData({ ...teacherFormData, club: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="담당 동아리를 입력하세요"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900">
                          {user.teacherProfile.club || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                  {isEditingTeacherProfile && (
                    <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>취소</span>
                      </button>
                      <button
                        onClick={handleSaveTeacherProfile}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? "저장 중..." : "저장"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 관리자 프로필 정보 */}
              {user.adminProfile && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    관리자 프로필 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">담당 학교</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.adminProfile.school?.name || "-"}
                      </p>
                      {user.adminProfile.school?.schoolType && (
                        <p className="text-sm text-gray-500 mt-1">
                          ({user.adminProfile.school.schoolType})
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당자 이름</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.adminProfile.school?.contactName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">전화번호</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.adminProfile.phoneNumber || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당자 전화번호</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.adminProfile.school?.contactPhone || "-"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">메모</p>
                      <p className="text-base font-medium text-gray-900">
                        {user.adminProfile.notes || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

