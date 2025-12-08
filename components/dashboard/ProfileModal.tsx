"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, Mail, Building2, MapPin, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  school: string | null;
  region: string | null;
  role: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileData {
  [key: string]: any;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchProfile();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/user/profile");
      
      if (!response.ok) {
        throw new Error("프로필 정보를 불러오는데 실패했습니다.");
      }

      const data = await response.json();
      setUser(data.user);
      setProfile(data.profile);
    } catch (err: any) {
      setError(err.message || "프로필 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleString("ko-KR");
  };

  const getRoleLabel = (role: string | null) => {
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

  const renderProfileFields = () => {
    if (!profile) return null;

    const fields: Array<{ label: string; value: any; key: string }> = [];

    if (user?.role === "student") {
      // 학생 프로필 필드
      const studentFields = [
        { key: "studentId", label: "학번" },
        { key: "grade", label: "학년" },
        { key: "classLabel", label: "학급" },
        { key: "section", label: "반" },
        { key: "seatNumber", label: "좌석 번호" },
        { key: "major", label: "전공" },
        { key: "sex", label: "성별" },
        { key: "classOfficer", label: "급장" },
        { key: "phoneNumber", label: "전화번호" },
        { key: "dateOfBirth", label: "생년월일" },
        { key: "address", label: "주소" },
        { key: "club", label: "동아리" },
        { key: "clubTeacher", label: "동아리 지도교사" },
        { key: "clubLocation", label: "동아리 장소" },
        { key: "remarks", label: "비고" },
      ];

      studentFields.forEach(({ key, label }) => {
        const value = profile[key];
        if (value !== null && value !== undefined && value !== "") {
          fields.push({ key, label, value });
        }
      });
    } else if (user?.role === "teacher") {
      // 교사 프로필 필드
      const teacherFields = [
        { key: "roleLabel", label: "직책" },
        { key: "major", label: "담당 과목" },
        { key: "classLabel", label: "담당 학급" },
        { key: "grade", label: "담당 학년" },
        { key: "phoneNumber", label: "전화번호" },
        { key: "dateOfBirth", label: "생년월일" },
        { key: "address", label: "주소" },
        { key: "club", label: "담당 동아리" },
        { key: "remarks", label: "비고" },
      ];

      teacherFields.forEach(({ key, label }) => {
        const value = profile[key];
        if (value !== null && value !== undefined && value !== "") {
          fields.push({ key, label, value });
        }
      });
    } else if (user?.role === "admin" || user?.role === "superadmin") {
      // 관리자 프로필 필드
      if (profile.school) {
        fields.push(
          { key: "schoolName", label: "학교명", value: profile.school.name },
          { key: "schoolType", label: "학교 유형", value: profile.school.schoolType },
          { key: "contactName", label: "담당자", value: profile.school.contactName },
          { key: "contactPhone", label: "담당자 전화번호", value: profile.school.contactPhone }
        );
      }
      if (profile.phoneNumber) {
        fields.push({ key: "phoneNumber", label: "전화번호", value: profile.phoneNumber });
      }
      if (profile.notes) {
        fields.push({ key: "notes", label: "메모", value: profile.notes });
      }
    }

    if (fields.length === 0) {
      return (
        <div className="text-sm text-gray-500 py-4">
          추가 프로필 정보가 없습니다.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, value }) => (
          <div key={key} className="space-y-1">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="text-sm text-gray-900">
              {Array.isArray(value) ? value.join(", ") : String(value)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (!mounted) return null;

  const modalContent = (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">프로필 정보</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
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
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      기본 정보
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            이메일
                          </p>
                          <p className="text-sm text-gray-900">{user.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            이름
                          </p>
                          <p className="text-sm text-gray-900">{user.name || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            학교
                          </p>
                          <p className="text-sm text-gray-900">{user.school || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            역할
                          </p>
                          <p className="text-sm text-gray-900">{getRoleLabel(user.role)}</p>
                        </div>
                        {user.region && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              지역
                            </p>
                            <p className="text-sm text-gray-900">{user.region}</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            가입일
                          </p>
                          <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 프로필 정보 */}
                  {profile && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">상세 정보</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {renderProfileFields()}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}

