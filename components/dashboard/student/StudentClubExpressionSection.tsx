"use client";

import { useEffect, useMemo, useState } from "react";

type ClubItem = {
  id: string;
  clubName: string;
  teacher: string;
  category: string | null;
  clubType: "creative" | "autonomous";
};

export default function StudentClubExpressionSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [content, setContent] = useState("");
  const [isExpressionLoading, setIsExpressionLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadClubs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/student/clubs");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "동아리 정보를 불러오는 데 실패했습니다.");
        }

        const loadedClubs = Array.isArray(data.clubs) ? data.clubs : [];
        setClubs(loadedClubs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "동아리 정보를 불러오는 데 실패했습니다.");
        setClubs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClubs();
  }, []);

  useEffect(() => {
    if (clubs.length === 0) {
      setSelectedClubId("");
      return;
    }

    const stillExists = clubs.some((club) => club.id === selectedClubId);
    if (!stillExists) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  useEffect(() => {
    const loadExpression = async () => {
      if (!selectedClubId) {
        setContent("");
        return;
      }

      try {
        setIsExpressionLoading(true);
        const response = await fetch(
          `/api/student/club-student-expression?clubId=${encodeURIComponent(selectedClubId)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "학생 활동 표현을 불러오는 데 실패했습니다.");
        }

        setContent(data.expression?.content || "");
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "학생 활동 표현을 불러오는 데 실패했습니다.");
        setContent("");
      } finally {
        setIsExpressionLoading(false);
      }
    };

    loadExpression();
  }, [selectedClubId]);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) || null,
    [clubs, selectedClubId]
  );

  const handleSave = async () => {
    if (!selectedClubId) return;

    const trimmed = content.trim();
    if (trimmed.length > 500) {
      window.alert("학생 활동 표현은 500자 이하로 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/student/club-student-expression", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: selectedClubId,
          content: trimmed,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "학생 활동 표현 저장에 실패했습니다.");
      }
      setContent(data.expression?.content || "");
      window.alert("저장되었습니다.");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "학생 활동 표현 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">동아리 활동 표현</h2>
        <p className="mt-2 text-sm text-gray-600">동아리 정보를 불러오는 중입니다...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">동아리 활동 표현</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </section>
    );
  }

  if (clubs.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">동아리 활동 표현</h2>
        <p className="mt-2 text-sm text-gray-600">배정된 동아리가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">동아리 활동 표현</h2>
          <p className="mt-1 text-sm text-gray-600">
            동아리 활동에서 느낀 점이나 참여 내용을 작성해 저장하세요.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label htmlFor="student-club-selector" className="mb-1 block text-xs font-medium text-gray-700">
            동아리 선택
          </label>
          <select
            id="student-club-selector"
            value={selectedClubId}
            onChange={(event) => setSelectedClubId(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {clubs.map((club) => (
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
          <span>담당교사 {selectedClub.teacher}</span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="student-club-expression" className="text-sm font-medium text-gray-700">
          학생 활동 표현
        </label>
        <textarea
          id="student-club-expression"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={500}
          disabled={isExpressionLoading || isSaving}
          placeholder={
            isExpressionLoading
              ? "기존 입력 내용을 불러오는 중입니다..."
              : "예: 이번 활동에서 맡은 역할, 새롭게 배운 점, 다음 시간 목표"
          }
          className="min-h-[160px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{content.length}/500자</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isExpressionLoading || isSaving}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
