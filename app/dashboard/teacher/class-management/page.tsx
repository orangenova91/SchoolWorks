import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n";
import CourseTabs from "@/components/dashboard/CourseTabs";
import StudentListTable from "@/components/dashboard/StudentListTable";
import AttendanceManagement from "@/components/dashboard/teacher/AttendanceManagement";
import CounselingManagement from "@/components/dashboard/teacher/CounselingManagement";
import UpdateHomeroomModalButton from "@/components/dashboard/UpdateHomeroomModalButton";

const AnnouncementPageClient = dynamic(
  () => import("../announcements/AnnouncementPageClient").then((mod) => mod.AnnouncementPageClient),
  { ssr: false, loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div> }
);

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

  // 담임반 정보 칩 생성 (classLabel 제외)
  const infoChips = [
    teacherProfile?.grade?.trim() ? `${teacherProfile.grade.trim()}학년` : null,
    teacherProfile?.section?.trim() ? teacherProfile.section.trim() : null,
  ].filter(Boolean) as string[];

  const homeroomTitle = "담임반 관리";

  // 담임반 공지 게시판용 학급 키 및 선택 고정 학급 (API·작성 폼에서 사용)
  let homeroomGrade = teacherProfile?.grade?.trim() || "";
  let homeroomClassNumber = teacherProfile?.section?.trim() || "";
  if (!homeroomClassNumber && teacherProfile?.classLabel) {
    const match = teacherProfile.classLabel.trim().match(/(\d+)\s*[-학년\s]*(\d+)\s*반?/);
    if (match) {
      if (!homeroomGrade) homeroomGrade = match[1];
      homeroomClassNumber = match[2];
    }
  }
  const normalizeNumber = (v: string) => (v || "").trim().replace(/^0+/, "");
  const homeroomClassKey =
    homeroomGrade && homeroomClassNumber
      ? `${normalizeNumber(homeroomGrade)}-${normalizeNumber(homeroomClassNumber)}`
      : undefined;
  const restrictedSelectedClasses =
    homeroomClassKey && homeroomGrade && homeroomClassNumber
      ? [{ grade: homeroomGrade, classNumber: homeroomClassNumber }]
      : undefined;

  return (
    <div className="space-y-6">
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{homeroomTitle}</h1>
              {teacherProfile?.classLabel?.trim() && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {teacherProfile.classLabel.trim()}학반
                </span>
              )}
            </div>
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
          <UpdateHomeroomModalButton initialClassLabel={teacherProfile?.classLabel} />
        </div>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "announcements", label: "공지사항" },
            { id: "students", label: "학생 관리" },
            { id: "attendance", label: "출결 관리" },
            { id: "counseling", label: "상담기록" },
            { id: "record", label: "생활기록부 관리" },
          ]}
        >
          {[
            <article
              key="announcements"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <AnnouncementPageClient
                title="담임반 공지사항"
                description="담임반 학생에게 전달할 공지사항을 작성하고 확인하세요."
                authorName={session.user.name ?? session.user.email ?? "담당 교사"}
                includeScheduled={true}
                audience="students"
                boardType="board_homeroom"
                homeroomClassKey={homeroomClassKey}
                restrictedSelectedClasses={restrictedSelectedClasses}
              />
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
              className="flex min-h-[60vh] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <header className="flex shrink-0 items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">출결 관리</h2>
              </header>
              <div className="mt-4 min-h-0 flex-1">
                <AttendanceManagement
                  hasHomeroom={!!teacherProfile?.classLabel}
                  students={homeroomStudents}
                  classLabel={teacherProfile?.classLabel ?? ""}
                />
              </div>
            </article>,
            <article
              key="counseling"
              className="flex min-h-[60vh] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <header className="flex shrink-0 items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">상담기록</h2>
              </header>
              <div className="mt-4 min-h-0 flex-1">
                <CounselingManagement
                  hasHomeroom={!!teacherProfile?.classLabel}
                  students={homeroomStudents}
                  classLabel={teacherProfile?.classLabel ?? ""}
                />
              </div>
            </article>,
            <article
              key="record"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">생활기록부 관리</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>서비스 준비중입니다. 빠른 시일 내에 추가 예정입니다.</p>
                </div>
              </div>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}

