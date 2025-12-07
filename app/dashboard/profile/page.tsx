import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { User, Mail, Building2, Shield, MapPin, Calendar, Clock } from "lucide-react";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // User와 관련 프로필 정보 가져오기
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: true,
      teacherProfile: true,
      adminProfile: {
        include: {
          school: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

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

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">프로필 정보</h2>
        <p className="text-gray-600">내 계정 정보를 확인할 수 있습니다.</p>
      </header>

      {/* 기본 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
          {user.region && (
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">지역</p>
                <p className="text-base font-medium text-gray-900">
                  {user.region}
                </p>
              </div>
            </div>
          )}
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
          {user.emailVerified && (
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">이메일 인증</p>
                <p className="text-base font-medium text-green-600">
                  인증 완료 ({formatDate(user.emailVerified)})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 학생 프로필 정보 */}
      {user.studentProfile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            학생 프로필 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.studentProfile.studentId && (
              <div>
                <p className="text-sm text-gray-500">학번</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.studentId}
                </p>
              </div>
            )}
            {user.studentProfile.grade && (
              <div>
                <p className="text-sm text-gray-500">학년</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.grade}
                </p>
              </div>
            )}
            {user.studentProfile.classLabel && (
              <div>
                <p className="text-sm text-gray-500">반</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.classLabel}
                </p>
              </div>
            )}
            {user.studentProfile.section && (
              <div>
                <p className="text-sm text-gray-500">구분</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.section}
                </p>
              </div>
            )}
            {user.studentProfile.major && (
              <div>
                <p className="text-sm text-gray-500">전공</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.major}
                </p>
              </div>
            )}
            {user.studentProfile.phoneNumber && (
              <div>
                <p className="text-sm text-gray-500">전화번호</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.phoneNumber}
                </p>
              </div>
            )}
            {user.studentProfile.club && (
              <div>
                <p className="text-sm text-gray-500">동아리</p>
                <p className="text-base font-medium text-gray-900">
                  {user.studentProfile.club}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 교사 프로필 정보 */}
      {user.teacherProfile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            교사 프로필 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.teacherProfile.roleLabel && (
              <div>
                <p className="text-sm text-gray-500">직책</p>
                <p className="text-base font-medium text-gray-900">
                  {user.teacherProfile.roleLabel}
                </p>
              </div>
            )}
            {user.teacherProfile.major && (
              <div>
                <p className="text-sm text-gray-500">담당 과목</p>
                <p className="text-base font-medium text-gray-900">
                  {user.teacherProfile.major}
                </p>
              </div>
            )}
            {user.teacherProfile.classLabel && (
              <div>
                <p className="text-sm text-gray-500">담당 반</p>
                <p className="text-base font-medium text-gray-900">
                  {user.teacherProfile.classLabel}
                </p>
              </div>
            )}
            {user.teacherProfile.phoneNumber && (
              <div>
                <p className="text-sm text-gray-500">전화번호</p>
                <p className="text-base font-medium text-gray-900">
                  {user.teacherProfile.phoneNumber}
                </p>
              </div>
            )}
            {user.teacherProfile.club && (
              <div>
                <p className="text-sm text-gray-500">담당 동아리</p>
                <p className="text-base font-medium text-gray-900">
                  {user.teacherProfile.club}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 관리자 프로필 정보 */}
      {user.adminProfile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            관리자 프로필 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.adminProfile.school && (
              <div>
                <p className="text-sm text-gray-500">담당 학교</p>
                <p className="text-base font-medium text-gray-900">
                  {user.adminProfile.school.name}
                </p>
                {user.adminProfile.school.schoolType && (
                  <p className="text-sm text-gray-500 mt-1">
                    ({user.adminProfile.school.schoolType})
                  </p>
                )}
              </div>
            )}
            {user.adminProfile.school?.contactName && (
              <div>
                <p className="text-sm text-gray-500">담당자 이름</p>
                <p className="text-base font-medium text-gray-900">
                  {user.adminProfile.school.contactName}
                </p>
              </div>
            )}
            {user.adminProfile.phoneNumber && (
              <div>
                <p className="text-sm text-gray-500">전화번호</p>
                <p className="text-base font-medium text-gray-900">
                  {user.adminProfile.phoneNumber}
                </p>
              </div>
            )}
            {user.adminProfile.school?.contactPhone && (
              <div>
                <p className="text-sm text-gray-500">담당자 전화번호</p>
                <p className="text-base font-medium text-gray-900">
                  {user.adminProfile.school.contactPhone}
                </p>
              </div>
            )}
            {user.adminProfile.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">메모</p>
                <p className="text-base font-medium text-gray-900">
                  {user.adminProfile.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

