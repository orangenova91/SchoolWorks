"use client";

import { useEffect, useMemo, useState } from "react";

type ClubItem = {
  id: string;
  clubName: string;
  teacher: string;
  category: string | null;
  clubType: "creative" | "autonomous";
  studentSelections: string | null;
};

type Student = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
};

type Props = {
  teacherName?: string | null;
  teacherEmail?: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function parseStudentSelections(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string" && value.trim() !== "");
    }

    if (parsed && typeof parsed === "object") {
      const allIds: string[] = [];
      Object.values(parsed).forEach((value) => {
        if (typeof value === "string" && value.trim() !== "") {
          allIds.push(value);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((id) => {
            if (typeof id === "string" && id.trim() !== "") {
              allIds.push(id);
            }
          });
        }
      });
      return allIds;
    }

    return [];
  } catch (error) {
    console.error("Failed to parse studentSelections:", error);
    return [];
  }
}

function sortStudentsByStudentId(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const aStudentId = a.studentId || "";
    const bStudentId = b.studentId || "";

    if (aStudentId && bStudentId) {
      const aNum = parseInt(aStudentId.replace(/\D/g, ""), 10) || 0;
      const bNum = parseInt(bStudentId.replace(/\D/g, ""), 10) || 0;

      if (aNum !== bNum) return aNum - bNum;
      return aStudentId.localeCompare(bStudentId, "ko");
    }

    if (!aStudentId && !bStudentId) {
      return a.name.localeCompare(b.name, "ko");
    }

    return aStudentId ? -1 : 1;
  });
}

export default function MyClubManagementSection({ teacherName, teacherEmail }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allClubs, setAllClubs] = useState<ClubItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [activityDrafts, setActivityDrafts] = useState<Record<string, string>>({});
  const [studentExpressionDrafts, setStudentExpressionDrafts] = useState<Record<string, string>>({});
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [savingStudentIds, setSavingStudentIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clubsRes, studentsRes] = await Promise.all([
          fetch("/api/academic-preparation/clubs"),
          fetch("/api/academic-preparation/students"),
        ]);

        if (!clubsRes.ok) {
          const data = await clubsRes.json().catch(() => ({}));
          throw new Error(data.error || "동아리 목록을 불러오는 데 실패했습니다.");
        }

        if (!studentsRes.ok) {
          const data = await studentsRes.json().catch(() => ({}));
          throw new Error(data.error || "학생 목록을 불러오는 데 실패했습니다.");
        }

        const clubsData = await clubsRes.json();
        const studentsData = await studentsRes.json();

        setAllClubs(Array.isArray(clubsData.clubs) ? clubsData.clubs : []);
        setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터를 불러오는 데 실패했습니다.");
        setAllClubs([]);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const myClubs = useMemo(() => {
    const teacherNameNormalized = normalize(teacherName);
    const teacherEmailNormalized = normalize(teacherEmail);

    return allClubs.filter((club) => {
      const clubTeacher = normalize(club.teacher);
      if (!clubTeacher) return false;
      return (
        (teacherNameNormalized !== "" && clubTeacher === teacherNameNormalized) ||
        (teacherEmailNormalized !== "" && clubTeacher === teacherEmailNormalized)
      );
    });
  }, [allClubs, teacherName, teacherEmail]);

  useEffect(() => {
    if (myClubs.length === 0) {
      setSelectedClubId("");
      return;
    }

    const stillExists = myClubs.some((club) => club.id === selectedClubId);
    if (!stillExists) {
      setSelectedClubId(myClubs[0].id);
    }
  }, [myClubs, selectedClubId]);

  const selectedClub = useMemo(
    () => myClubs.find((club) => club.id === selectedClubId) || null,
    [myClubs, selectedClubId]
  );

  const selectedStudents = useMemo(() => {
    if (!selectedClub) return [];

    const selectedIds = parseStudentSelections(selectedClub.studentSelections);
    const selectedIdSet = new Set(selectedIds);
    const matched = students.filter((student) => selectedIdSet.has(student.id));

    return sortStudentsByStudentId(matched);
  }, [selectedClub, students]);

  useEffect(() => {
    const loadActivities = async () => {
      if (!selectedClubId) {
        setActivityDrafts({});
        return;
      }

      try {
        setIsActivityLoading(true);
        const response = await fetch(
          `/api/club-student-activities?clubId=${encodeURIComponent(selectedClubId)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "활동 내용을 불러오는 데 실패했습니다.");
        }

        const nextDrafts: Record<string, string> = {};
        if (Array.isArray(data.activities)) {
          data.activities.forEach((item: { studentId?: string; content?: string }) => {
            if (!item.studentId) return;
            nextDrafts[item.studentId] = item.content || "";
          });
        }
        setActivityDrafts(nextDrafts);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "활동 내용을 불러오는 데 실패했습니다.";
        window.alert(message);
        setActivityDrafts({});
      } finally {
        setIsActivityLoading(false);
      }
    };

    loadActivities();
  }, [selectedClubId]);

  useEffect(() => {
    const loadStudentExpressions = async () => {
      if (!selectedClubId) {
        setStudentExpressionDrafts({});
        return;
      }

      try {
        const response = await fetch(
          `/api/teacher/club-student-expressions?clubId=${encodeURIComponent(selectedClubId)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "학생 활동 표현을 불러오는 데 실패했습니다.");
        }

        const nextDrafts: Record<string, string> = {};
        if (Array.isArray(data.expressions)) {
          data.expressions.forEach((item: { studentId?: string; content?: string }) => {
            if (!item.studentId) return;
            nextDrafts[item.studentId] = item.content || "";
          });
        }
        setStudentExpressionDrafts(nextDrafts);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "학생 활동 표현을 불러오는 데 실패했습니다.";
        window.alert(message);
        setStudentExpressionDrafts({});
      }
    };

    loadStudentExpressions();
  }, [selectedClubId]);

  const updateActivityDraft = (studentId: string, value: string) => {
    setActivityDrafts((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const saveActivity = async (studentId: string) => {
    if (!selectedClubId) return;

    const content = (activityDrafts[studentId] || "").trim();
    if (content.length > 500) {
      window.alert("활동 내용은 500자 이하로 입력해주세요.");
      return;
    }

    try {
      setSavingStudentIds((prev) => ({ ...prev, [studentId]: true }));
      const response = await fetch("/api/club-student-activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: selectedClubId,
          studentId,
          content,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "활동 내용 저장에 실패했습니다.");
      }

      setActivityDrafts((prev) => ({
        ...prev,
        [studentId]: data.activity?.content || "",
      }));
      window.alert("저장되었습니다.");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "활동 내용 저장에 실패했습니다.");
    } finally {
      setSavingStudentIds((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">내 동아리 관리</h2>
        <p className="mt-2 text-sm text-gray-600">명단을 불러오는 중입니다...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">내 동아리 관리</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </section>
    );
  }

  if (myClubs.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">내 동아리 관리</h2>
        <p className="mt-2 text-sm text-gray-600">
          현재 계정이 담당교사로 배정된 동아리를 찾지 못했습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">내 동아리 관리</h2>
          <p className="mt-1 text-sm text-gray-600">
            배정된 학생 명단을 확인할 수 있습니다.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label htmlFor="my-club-selector" className="mb-1 block text-xs font-medium text-gray-700">
            동아리 선택
          </label>
          <select
            id="my-club-selector"
            value={selectedClubId}
            onChange={(event) => setSelectedClubId(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {myClubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.clubName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClub && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">{selectedClub.clubName}</span>
          <span className="mx-2 text-gray-400">|</span>
          <span>{selectedClub.clubType === "creative" ? "창체 동아리" : "자율 동아리"}</span>
          <span className="mx-2 text-gray-400">|</span>
          <span>배정 학생 {selectedStudents.length}명</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-16 border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                번호
              </th>
              <th className="w-32 border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                학번
              </th>
              <th className="w-40 border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                이름
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                학생 활동 표현
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                활동 내용 입력
              </th>
            </tr>
          </thead>
          <tbody>
            {selectedStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                  배정된 학생이 없습니다.
                </td>
              </tr>
            ) : (
              selectedStudents.map((student, index) => (
                <tr key={student.id} className="odd:bg-white even:bg-gray-50/40">
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-sm text-gray-700">
                    {index + 1}
                  </td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-sm text-gray-700">
                    {student.studentId || "-"}
                  </td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="border-b border-gray-100 px-3 py-2">
                    <textarea
                      value={studentExpressionDrafts[student.id] || ""}
                      readOnly
                      disabled
                      placeholder="학생이 작성한 활동 표현이 없습니다."
                      className="min-h-[72px] w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700"
                    />
                  </td>
                  <td className="border-b border-gray-100 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <textarea
                        value={activityDrafts[student.id] || ""}
                        onChange={(event) => updateActivityDraft(student.id, event.target.value)}
                        placeholder={
                          isActivityLoading
                            ? "활동 내용 불러오는 중..."
                            : "학생 활동 내용을 입력하세요."
                        }
                        maxLength={500}
                        disabled={isActivityLoading || Boolean(savingStudentIds[student.id])}
                        className="min-h-[72px] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => saveActivity(student.id)}
                        disabled={isActivityLoading || Boolean(savingStudentIds[student.id])}
                        className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {savingStudentIds[student.id] ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
