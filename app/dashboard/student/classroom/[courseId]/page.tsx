import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseTabs from "@/components/dashboard/CourseTabs";
import { AnnouncementList } from "@/components/dashboard/AnnouncementList";
import AssignmentList from "@/components/dashboard/AssignmentList";
import StudentEvaluationStudentView from "@/components/dashboard/StudentEvaluationStudentView";

interface StudentCoursePageProps {
  params: {
    courseId: string;
  };
}

export default async function StudentCoursePage({
  params,
}: StudentCoursePageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  const studentId = session.user.id;

  type StudentCourse = {
    id: string;
    academicYear: string;
    semester: string;
    subject: string;
    grade: string;
    instructor: string;
    classroom: string;
    joinCode: string | null;
    createdAt: Date;
  };

  type StudentClassGroup = {
    id: string;
    name: string;
    period: string | null;
    courseId: string;
    course: StudentCourse;
  };

  const classGroups: StudentClassGroup[] = studentId
    ? await (
        prisma as unknown as {
          classGroup: {
            findMany: (args: {
              where: { courseId: string; studentIds: { has: string } };
              orderBy: { createdAt: "desc" };
              include: { course: true };
            }) => Promise<StudentClassGroup[]>;
          };
        }
      ).classGroup.findMany({
        where: { courseId: params.courseId, studentIds: { has: studentId } },
        orderBy: { createdAt: "desc" },
        include: { course: true },
      })
    : [];

  const course = classGroups[0]?.course;

  if (!course) {
    notFound();
  }

  const formatGradeLabel = (grade: string) => {
    const trimmed = grade.trim();
    if (!trimmed) {
      return "";
    }
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed}학년`;
    }
    if (trimmed.endsWith("학년")) {
      return trimmed;
    }
    return trimmed;
  };

  const infoChips = [
    course.academicYear?.trim()
      ? `${course.academicYear.trim()} 학년도`
      : null,
    course.semester?.trim() ? course.semester.trim() : null,
    course.grade?.trim() ? formatGradeLabel(course.grade) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span>수업 코드</span>
            <span className="font-mono tracking-wide text-sm">
              {course.joinCode ?? "미발급"}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {course.subject}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              강사 {course.instructor} · 강의실 {course.classroom}
            </p>
            {classGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium text-gray-700">내 학반</span>
                {classGroups.map((group) => (
                  <span
                    key={group.id}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700"
                  >
                    {group.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <section>
        <CourseTabs
          tabs={[
            { id: "overview", label: "수업 소개" },
            { id: "announcements", label: "공지사항" },
            { id: "assignments", label: "수업 자료" },
            { id: "notes", label: "학생 평가" },
            { id: "record", label: "생기부" },
          ]}
        >
          {[
            <article
              key="overview"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6"
            >
              <header>
                <h2 className="text-lg font-semibold text-gray-900">수업 소개</h2>
              </header>
              <div className="grid gap-4 sm:grid-cols-2 text-sm text-gray-700">
                <div>
                  <p className="text-xs text-gray-500">학년도</p>
                  <p className="font-medium">{course.academicYear?.trim() || "정보 없음"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">학기</p>
                  <p className="font-medium">{course.semester?.trim() || "정보 없음"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">대상 학년</p>
                  <p className="font-medium">{formatGradeLabel(course.grade)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">교과명</p>
                  <p className="font-medium">{course.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">강사명</p>
                  <p className="font-medium">{course.instructor}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">강의실</p>
                  <p className="font-medium">{course.classroom}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">수업 코드</p>
                  <p className="font-mono text-sm text-gray-800">
                    {course.joinCode ?? "미발급"}
                  </p>
                </div>
              </div>
            </article>,
            <article
              key="announcements"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header>
                <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
              </header>
              <AnnouncementList
                includeScheduled={false}
                courseId={course.id}
                boardType="board_class"
              />
            </article>,
            <article
              key="assignments"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header>
                <h2 className="text-lg font-semibold text-gray-900">수업 자료</h2>
              </header>
              <AssignmentList
                courseId={course.id}
                showActions={false}
                emptyMessage="등록된 수업 자료가 없습니다."
              />
            </article>,
            <article
              key="notes"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header>
                <h2 className="text-lg font-semibold text-gray-900">학생 평가</h2>
              </header>
              <StudentEvaluationStudentView courseId={course.id} />
            </article>,
            <article
              key="record"
              className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
            >
              생기부는 준비 중입니다.
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}
