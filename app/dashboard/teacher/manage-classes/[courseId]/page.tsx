import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseTabs from "@/components/dashboard/CourseTabs";
import AssignmentManager from "@/components/dashboard/AssignmentManager";
import StudentEvaluation from "@/components/dashboard/StudentEvaluation";
import CourseSettings from "@/components/dashboard/CourseSettings";
import CourseOverview from "@/components/dashboard/CourseOverview";
import CreateClassGroupButton from "@/components/dashboard/CreateClassGroupButton";
import ClassGroupList from "@/components/dashboard/ClassGroupList";
import AttendanceSection from "@/components/dashboard/AttendanceSection";
import ClassGroupBadges from "@/components/dashboard/ClassGroupBadges";

interface ManageClassDetailPageProps {
  params: {
    courseId: string;
  };
}

export default async function ManageClassDetailPage({
  params,
}: ManageClassDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const course = await (prisma as unknown as {
    classGroup: {
      findMany: (args: {
        where: { courseId: string };
        select: { id: true; name: true };
        orderBy?: { createdAt: "asc" | "desc" };
      }) => Promise<{ id: string; name: string }[]>;
    };
    course: {
      findFirst: (args: {
        where: { id: string; teacherId: string };
      }) => Promise<{
        id: string;
        academicYear: string;
        semester: string;
        subjectGroup: string;
        subjectArea: string;
        careerTrack: string;
        subject: string;
        grade: string;
        instructor: string;
        classroom: string;
        description: string;
        joinCode: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null>;
    };
  }).course.findFirst({
    where: {
      id: params.courseId,
      teacherId: session.user.id,
    },
  });

  if (!course) {
    notFound();
  }

  const classGroups =
    (await (prisma as any).classGroup.findMany({
      where: { courseId: course.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })) ?? [];

  // 교사의 학교와 같은 학교의 학생만 조회
  const students =
    (await (prisma as any).user.findMany({
      where: { 
        role: "student",
        ...(session.user.school ? { school: session.user.school } : {}),
      },
      select: { 
        id: true, 
        name: true, 
        email: true,
        studentProfile: {
          select: {
            studentId: true,
            classLabel: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })) ?? [];

  const infoChips = [
    course.academicYear?.trim()
      ? `${course.academicYear.trim()} 학년도`
      : null,
    course.semester?.trim() ? course.semester.trim() : null,
    course.grade?.trim()
      ? ` ${course.grade.trim()} 학년`
      : null,
  ].filter(Boolean) as string[];

  // 오늘 날짜와 요일 가져오기
  const today = new Date();
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const todayDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayWeekday = weekdays[today.getDay()];

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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.subject}</h1>
            <p className="text-sm text-gray-600 mt-1">
              강사 {course.instructor} · 강의실 {course.classroom}
            </p>
            {classGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium text-gray-700">
                  학반 ({classGroups.length}개)
                </span>
                <ClassGroupBadges
                  classGroups={classGroups}
                  courseId={course.id}
                  students={students}
                />
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span>수업 코드</span>
            <span className="font-mono tracking-wide text-sm">
              {course.joinCode ?? "미발급"}
            </span>
          </div>
        </div>
        
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "overview", label: "수업 소개" },
            { id: "announcements", label: "공지사항" },
            { id: "attendance", label: "학생 출결" },
            { id: "assignments", label: "수업 자료" },
            { id: "notes", label: "학생 평가" },
            { id: "record", label: "생기부" },
            { id: "settings", label: "설정" },
          ]}
        >
          {[
            <CourseOverview
              key="overview"
              courseId={course.id}
              course={{
                academicYear: course.academicYear,
                semester: course.semester,
                grade: course.grade,
                subject: course.subject,
                subjectGroup: course.subjectGroup,
                subjectArea: course.subjectArea,
                careerTrack: course.careerTrack,
                instructor: course.instructor,
                classroom: course.classroom,
                joinCode: course.joinCode,
                description: course.description,
              }}
            />,
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
              key="attendance"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <AttendanceSection courseId={course.id} students={students} />
            </article>,
            <article
              key="assignments"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">수업 자료</h2>
              </header>
              <AssignmentManager courseId={course.id} />
            </article>,
            <article
              key="notes"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">학생 평가</h2>
              </header>
              <StudentEvaluation courseId={course.id} />
            </article>,
            <article
              key="record"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">생기부</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>생기부 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="settings"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">설정</h2>
              </header>
              <div className="space-y-6">
                <div className="text-sm text-gray-600">
                  <p>수업과 관련된 위험 작업을 관리합니다.</p>
                </div>
                <CourseSettings courseId={course.id} courseName={course.subject} />
              </div>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}

