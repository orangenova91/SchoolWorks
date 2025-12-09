import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n";
import CourseTabs from "@/components/dashboard/CourseTabs";
import StudentListTable from "@/components/dashboard/StudentListTable";
import WeeklyAttendanceTable from "@/components/dashboard/WeeklyAttendanceTable";

export default async function ClassManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");

  // 교사 프로필에서 담임반 정보 가져오기
  const teacherProfile = await (prisma as any).teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      grade: true,
      classLabel: true,
      section: true,
      school: true,
    },
  });

  // 담임반 학생 목록 가져오기 (교사의 classLabel과 동일한 학생들)
  let homeroomStudents: any[] = [];
  
  if (teacherProfile?.classLabel) {
    // MongoDB에서 nested 필터링이 제대로 작동하지 않을 수 있으므로
    // studentProfile을 포함하여 가져온 후 필터링
    const allStudents = await (prisma as any).user.findMany({
      where: {
        role: "student",
        // 같은 학교의 학생만 조회
        ...(session.user.school ? { school: session.user.school } : {}),
        studentProfile: {
          isNot: null, // studentProfile이 존재하는 학생만
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        studentProfile: {
          select: {
            studentId: true,
            school: true,
            grade: true,
            classLabel: true,
            section: true,
            seatNumber: true,
            major: true,
            sex: true,
            classOfficer: true,
            specialEducation: true,
            phoneNumber: true,
            siblings: true,
            academicStatus: true,
            remarks: true,
            club: true,
            clubTeacher: true,
            clubLocation: true,
            dateOfBirth: true,
            address: true,
            residentRegistrationNumber: true,
            motherName: true,
            motherPhone: true,
            motherRemarks: true,
            fatherName: true,
            fatherPhone: true,
            fatherRemarks: true,
            electiveSubjects: true,
          },
        },
      },
    });

    // 교사의 classLabel과 동일하고 같은 학교인 학생만 필터링
    const teacherClassLabel = teacherProfile.classLabel.trim();
    const teacherSchool = session.user.school || teacherProfile.school;
    
    homeroomStudents = allStudents.filter((student: any) => {
      const studentProfile = student.studentProfile;
      if (!studentProfile) return false;
      
      const studentClassLabel = studentProfile.classLabel?.trim() || "";
      const studentSchool = student.school || studentProfile.school;
      
      // classLabel이 일치하고, 학교도 일치하는 경우만
      const classLabelMatch = studentClassLabel === teacherClassLabel;
      const schoolMatch = !teacherSchool || !studentSchool || studentSchool === teacherSchool;
      
      return classLabelMatch && schoolMatch;
    });

    // 좌석번호와 이름으로 정렬
    homeroomStudents.sort((a, b) => {
      const seatA = a.studentProfile?.seatNumber || "";
      const seatB = b.studentProfile?.seatNumber || "";
      if (seatA !== seatB) {
        return seatA.localeCompare(seatB, undefined, { numeric: true, sensitivity: 'base' });
      }
      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB);
    });
  }

  // 담임반 정보 칩 생성
  const infoChips = [
    teacherProfile?.grade?.trim() ? `${teacherProfile.grade.trim()}학년` : null,
    teacherProfile?.classLabel?.trim()
      ? `${teacherProfile.classLabel.trim()}반`
      : null,
    teacherProfile?.section?.trim() ? teacherProfile.section.trim() : null,
  ].filter(Boolean) as string[];

  const homeroomTitle = teacherProfile?.grade && teacherProfile?.classLabel
    ? `${teacherProfile.grade}학년 ${teacherProfile.classLabel}반`
    : "담임반 관리";

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link
              href="/dashboard/teacher"
              className="hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-1"
            >
              선생님 대시보드
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700 font-medium truncate">
            {t.sidebar.teacher.classManagement}
          </li>
        </ol>
      </nav>

      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        {infoChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {infoChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{homeroomTitle}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {teacherProfile?.school || "학교 정보 없음"}
            </p>
            {homeroomStudents.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium text-gray-700">
                  학생 ({homeroomStudents.length}명)
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "dashboard", label: "대시보드" },
            { id: "students", label: "학생 관리" },
            { id: "attendance", label: "출결 관리" },
            { id: "announcements", label: "공지사항" },
            { id: "counseling", label: "상담기록" },
            { id: "statistics", label: "통계" },
          ]}
        >
          {[
            <article
              key="dashboard"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">대시보드</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>대시보드 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="students"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">학생 관리</h2>
                {homeroomStudents.length > 0 && (
                  <div className="text-sm text-gray-600">
                    총 {homeroomStudents.length}명
                  </div>
                )}
              </header>
              <div className="space-y-4">
                {teacherProfile?.classLabel ? (
                  <StudentListTable students={homeroomStudents} />
                ) : (
                  <div className="text-sm text-gray-600">
                    <p>담임반 정보가 없습니다. 담임반을 먼저 설정해주세요.</p>
                  </div>
                )}
              </div>
            </article>,
            <article
              key="attendance"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">출결 관리</h2>
              </header>
              <div className="space-y-4">
                {teacherProfile?.classLabel ? (
                  <WeeklyAttendanceTable
                    students={homeroomStudents}
                    classLabel={teacherProfile.classLabel}
                  />
                ) : (
                  <div className="text-sm text-gray-600">
                    <p>담임반 정보가 없습니다. 담임반을 먼저 설정해주세요.</p>
                  </div>
                )}
              </div>
            </article>,
            <article
              key="announcements"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>공지사항 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="counseling"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">상담기록</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>상담기록 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="statistics"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">통계</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>통계 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}

