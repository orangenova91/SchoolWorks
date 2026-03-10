 "use client";

import { useEffect, useState } from "react";

export type AfterSchoolTeacher = {
  id: string;
  name: string | null;
  email: string | null;
};

export function useAfterSchoolManager(currentUserId?: string | null) {
  const [managerId, setManagerId] = useState<string | null>(null);
  const [managerTeachers, setManagerTeachers] = useState<AfterSchoolTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/after-school/manager");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "담당자 정보를 불러오는 데 실패했습니다.");
        }

        const data = await res.json();
        if (cancelled) return;

        setManagerId(data.manager?.teacherId ?? null);
        setManagerTeachers(data.teachers ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "담당자 정보를 불러오는 데 실패했습니다.");
          setManagerTeachers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const isManager = !!currentUserId && managerId === currentUserId;

  const refresh = () => {
    setReloadToken((prev) => prev + 1);
  };

  return {
    managerId,
    managerTeachers,
    isManager,
    loading,
    error,
    refresh,
  };
}

