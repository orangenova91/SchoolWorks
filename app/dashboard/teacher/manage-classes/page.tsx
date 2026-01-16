import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import CreateClassPopupButton from "@/components/dashboard/CreateClassPopupButton";

export default async function ManageClassesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");
  const copy = t.dashboard.teacherSections.manageClasses;
  const instructorName = session.user.name ?? session.user.email ?? "";
  const teacherId = session.user.id;

  type ClassGroupSchedule = {
    day: string;
    period: string;
  };

  type ClassGroupSummary = {
    id: string;
    name: string;
    period: string | null;
    schedules: string; // JSON string
    studentIds: string[];
  };

  type TeacherCourse = {
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
    classGroups: ClassGroupSummary[];
  };

  const classes: TeacherCourse[] = teacherId
    ? await (
        prisma as unknown as {
          course: {
            findMany: (args: {
              where: { teacherId: string };
              orderBy: { createdAt: "desc" };
              include: { classGroups: true };
            }) => Promise<TeacherCourse[]>;
          };
        }
      ).course.findMany({
        where: { teacherId },
        orderBy: { createdAt: "desc" },
        include: { classGroups: true },
      })
    : [];

  const formatGrade = (grade: string) => {
    switch (grade) {
      case "1":
        return "1학년";
      case "2":
        return "2학년";
      case "3":
        return "3학년";
      default:
        return grade;
    }
  };

  const parseSchedules = (value: string): ClassGroupSchedule[] => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (schedule): schedule is ClassGroupSchedule =>
            typeof schedule?.day === "string" && typeof schedule?.period === "string"
        );
      }
      return [];
    } catch {
      return [];
    }
  };

  return (
    <div>
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
            <p className="mt-2 text-sm text-gray-600">{copy.description}</p>
          </div>
          <CreateClassPopupButton instructorName={instructorName} />
        </div>
      </header>
      <section className="space-y-4">
          <div className="rounded-lg border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900">내 수업 목록</h2>
            {classes.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                아직 생성된 수업이 없습니다. 상단의 ‘수업 생성’ 버튼을 눌러 첫 수업을 만들어 보세요.
              </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {classes.map((course) => (
                    <Link
                      key={course.id}
                      href={`/dashboard/teacher/manage-classes/${course.id}`}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <article className="flex h-full flex-col justify-between">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            {(course.academicYear?.trim() || course.semester?.trim()) && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                {course.academicYear?.trim() && (
                                  <span>{course.academicYear.trim()}학년도</span>
                                )}
                                {course.semester?.trim() && <span>{course.semester.trim()}</span>}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <div className="flex items-center gap-1 overflow-hidden">
                                {course.joinCode ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-0.5 font-medium text-indigo-700 border border-indigo-100">
                                    <span className="uppercase tracking-wide text-[10px] text-indigo-500">
                                      코드
                                    </span>
                                    <span className="font-mono text-sm">
                                      {course.joinCode}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-400">수업 코드 미발급</span>
                                )}
                              </div>
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
                                {formatGrade(course.grade)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <h3 className="text-lg font-semibold text-gray-900 flex-1 text-center">
                                {course.subject}
                              </h3>
                              <dl className="space-y-1 text-right text-sm text-gray-600">
                                <div className="flex items-center justify-end gap-2">
                                  <dt className="font-medium text-gray-500">강사</dt>
                                  <dd>{course.instructor}</dd>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  <dt className="font-medium text-gray-500">강의실</dt>
                                  <dd>{course.classroom}</dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                          {course.classGroups.length > 0 ? (
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                                <span>학반 목록</span>
                                <span className="text-xs text-gray-500">
                                  총 {course.classGroups.length}개
                                </span>
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {course.classGroups.map((group) => {
                                  const schedules = parseSchedules(group.schedules);
                                  return (
                                    <div
                                      key={group.id}
                                      className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900">
                                          {group.name}
                                        </span>
                                        {group.period && (
                                          <span className="text-xs text-gray-500">
                                            차시 {group.period}
                                          </span>
                                        )}
                                      </div>
                                      {schedules.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                          {schedules.map((schedule, index) => (
                                            <span
                                              key={`${group.id}-schedule-${index}`}
                                              className="rounded-md bg-white px-2 py-1 border border-gray-200"
                                            >
                                              {schedule.day} {schedule.period}교시
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <p className="mt-2 text-xs text-gray-500">
                                        학생 {group.studentIds.length}명
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-gray-500">
                              아직 생성된 학반이 없습니다.
                            </p>
                          )}
                        </div>

                        <footer className="mt-4 text-xs text-gray-400">
                          생성일 · {course.createdAt.toLocaleString("ko-KR")}
                        </footer>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
          </div>
        </section>
    </div>
  );
}

