import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function StudentClassroomPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");
  const studentId = session.user.id;

  type ClassGroupSchedule = {
    day: string;
    period: string;
  };

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
    schedules: string;
    studentIds: string[];
    courseId: string;
    course: StudentCourse;
  };

  const classGroups: StudentClassGroup[] = studentId
    ? await (
        prisma as unknown as {
          classGroup: {
            findMany: (args: {
              where: { studentIds: { has: string } };
              orderBy: { createdAt: "desc" };
              include: { course: true };
            }) => Promise<StudentClassGroup[]>;
          };
        }
      ).classGroup.findMany({
        where: { studentIds: { has: studentId } },
        orderBy: { createdAt: "desc" },
        include: { course: true },
      })
    : [];

  const courses = classGroups.reduce<Record<string, { course: StudentCourse; classGroups: StudentClassGroup[] }>>(
    (acc, group) => {
      if (!acc[group.courseId]) {
        acc[group.courseId] = { course: group.course, classGroups: [] };
      }
      acc[group.courseId].classGroups.push(group);
      return acc;
    },
    {}
  );

  const courseEntries = Object.values(courses).sort(
    (a, b) => b.course.createdAt.getTime() - a.course.createdAt.getTime()
  );

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
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.studentClassroomTitle}</h1>
        <p className="text-sm text-gray-600">{t.dashboard.studentClassroomDescription}</p>
      </header>
      <section className="space-y-4 mt-6">
        <div className="rounded-lg border border-gray-100 p-4 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">내 수업 목록</h2>
          {courseEntries.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              아직 배정된 수업이 없습니다. 담당 선생님께 문의해 주세요.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courseEntries.map(({ course, classGroups: groups }) => (
                <Link key={course.id} href={`/dashboard/student/classroom/${course.id}`}>
                  <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between transition hover:border-indigo-200 hover:shadow-md">
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
                              <span className="font-mono text-sm">{course.joinCode}</span>
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

                    {groups.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                          <span>내 학반</span>
                          <span className="text-xs text-gray-500">총 {groups.length}개</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {groups.map((group) => {
                            const schedules = parseSchedules(group.schedules);
                            return (
                              <div
                                key={group.id}
                                className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-gray-900">{group.name}</span>
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
                      <p className="mt-4 text-sm text-gray-500">아직 배정된 학반이 없습니다.</p>
                    )}
                  </div>

                    <footer className="mt-4 text-xs text-gray-400">
                      개설일 · {course.createdAt.toLocaleString("ko-KR")}
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

