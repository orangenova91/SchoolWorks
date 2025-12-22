import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StudentListTable from "@/components/dashboard/teacher/StudentListTable";

export const dynamic = 'force-dynamic';

export default async function TeacherStudentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const teacherSchool = session.user.school;

  // 같은 학교의 학생들만 조회
  const students = await prisma.user.findMany({
    where: {
      role: "student",
      school: teacherSchool || undefined,
    },
    orderBy: [
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      school: true,
      createdAt: true,
    },
  });

  // StudentProfile 정보 가져오기
  const studentIds = students.map((student) => student.id);
  const prismaAny = prisma as any;
  const studentProfiles = studentIds.length > 0
    ? await prismaAny.studentProfile.findMany({
        where: {
          userId: { in: studentIds },
        },
        select: {
          userId: true,
          studentId: true,
          grade: true,
          classLabel: true,
          section: true,
          sex: true,
          phoneNumber: true,
        },
      })
    : [];

  type StudentProfileSummary = {
    userId: string;
    studentId: string | null;
    grade: string | null;
    classLabel: string | null;
    section: string | null;
    sex: string | null;
    phoneNumber: string | null;
  };

  const profileMap = new Map<string, StudentProfileSummary>(
    studentProfiles.map((profile: StudentProfileSummary) => [
      profile.userId,
      profile,
    ])
  );

  const studentsWithProfiles = students.map((student) => {
    const profile = profileMap.get(student.id);
    return {
      id: student.id,
      name: student.name ?? "-",
      email: student.email,
      school: student.school ?? "-",
      studentId: profile?.studentId ?? "-",
      grade: profile?.grade ?? "-",
      classLabel: profile?.classLabel ?? "-",
      section: profile?.section ?? "-",
      sex: profile?.sex ?? "-",
      phoneNumber: profile?.phoneNumber ?? "-",
      createdAt: student.createdAt,
    };
// ... existing code ...

}).sort((a, b) => {
    // 학번으로 정렬 (숫자로 변환 가능하면 숫자 순, 아니면 문자열 순)
    const aId = a.studentId === "-" ? "" : a.studentId;
    const bId = b.studentId === "-" ? "" : b.studentId;
    
    // 숫자로 변환 시도
    const aNum = parseInt(aId, 10);
    const bNum = parseInt(bId, 10);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      // 둘 다 숫자면 숫자 순으로 정렬
      return aNum - bNum;
    } else {
      // 하나라도 숫자가 아니면 문자열 순으로 정렬
      return aId.localeCompare(bId);
    }
  });

  // 학년별 총 학생수 계산 (1, 2, 3학년)
  const grade1Count = studentsWithProfiles.filter(s => s.grade === "1").length;
  const grade2Count = studentsWithProfiles.filter(s => s.grade === "2").length;
  const grade3Count = studentsWithProfiles.filter(s => s.grade === "3").length;

  // classLabel에서 반 번호만 추출하는 함수
  const getSectionNumber = (classLabel: string): string => {
    if (classLabel === "-") return "";
    // "1-1" 형태면 하이픈 뒤의 숫자, 아니면 그대로
    return classLabel.includes("-") ? classLabel.split("-")[1] : classLabel;
  };

  // 학년-반번호별 학생수 계산 (테이블 형태용)
  const gradeSectionStats = studentsWithProfiles.reduce((acc, student) => {
    const grade = student.grade !== "-" ? student.grade : null;
    const sectionNumber = getSectionNumber(student.classLabel);
    
    if (grade && sectionNumber) {
      const key = `${grade}-${sectionNumber}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 모든 반 번호 목록 추출 (헤더용)
  const allSectionNumbers = Array.from(
    new Set(
      studentsWithProfiles
        .map(s => getSectionNumber(s.classLabel))
        .filter(s => s !== "")
    )
  ).sort((a, b) => {
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });

  // 학년별-반번호별 학생수 조회
  const getGradeSectionCount = (grade: string, sectionNumber: string) => {
    return gradeSectionStats[`${grade}-${sectionNumber}`] || 0;
  };

  // 각 학년별 반 번호 목록 추출
  const getSectionNumbersByGrade = (grade: string) => {
    return Array.from(
      new Set(
        studentsWithProfiles
          .filter(s => s.grade === grade && getSectionNumber(s.classLabel) !== "")
          .map(s => getSectionNumber(s.classLabel))
      )
    ).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  };

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            <Link
              href="/dashboard/teacher"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              대시보드로 돌아가기
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">학생명렬</h1>
            <p className="mt-2 text-sm text-gray-600">
              학교 학생 목록을 확인할 수 있습니다.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-w-[600px]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="text-sm text-gray-500 mt-1">전체 학생</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {studentsWithProfiles.length}
                  </div>
                </div>
                <div className="flex-1 pt-1 border-l border-gray-300 pl-6">
                  {allSectionNumbers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-separate" style={{ borderSpacing: '0 0rem' }}>
                        <thead>
                          <tr>
                            <th className="text-xs px-2 py-1 text-left text-gray-500 font-semibold uppercase tracking-wider">
                              
                            </th>
                            <th className="text-xs px-2 py-1 text-center text-gray-500 font-semibold uppercase tracking-wider">
                              총 학생수
                            </th>
                            {allSectionNumbers.map((sectionNumber) => (
                              <th key={sectionNumber} className="text-xs px-2 py-1 text-center text-gray-500 font-semibold uppercase tracking-wider">
                                {sectionNumber}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {["1", "2", "3"].map((grade) => {
                            const gradeSectionNumbers = getSectionNumbersByGrade(grade);
                            const gradeCount = grade === "1" ? grade1Count : grade === "2" ? grade2Count : grade3Count;
                            return (
                              <tr key={grade}>
                                <td className="px-2 py-1 text-sm text-gray-600">
                                  {grade}학년
                                </td>
                                <td className="px-2 py-1 text-sm text-center text-gray-900 font-semibold">
                                  {gradeCount}명
                                </td>
                                {allSectionNumbers.map((sectionNumber) => {
                                  const count = getGradeSectionCount(grade, sectionNumber);
                                  // 해당 학년에 이 반이 없으면 "-" 표시
                                  if (!gradeSectionNumbers.includes(sectionNumber)) {
                                    return (
                                      <td key={`${grade}-${sectionNumber}`} className="px-2 py-1 text-center text-gray-300">
                                        -
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={`${grade}-${sectionNumber}`} className="px-2 py-1 text-center text-gray-900 font-semibold">
                                      {count > 0 ? count : "-"}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">학급 정보 없음</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <StudentListTable students={studentsWithProfiles} />
    </div>
  );
}

