"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import CalendarView, { CalendarEvent } from "./CalendarView";
import { TeacherAutocomplete } from "./TeacherAutocomplete";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ChevronUp, ChevronDown, Printer, Upload, HelpCircle } from "lucide-react";

const WEEKDAY_LABELS: Record<number, string> = {
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
};

const SLOT_MIN = 1;
const SLOT_MAX = 5;

type Teacher = { id: string; name: string | null; email: string; roleLabel: string | null };
type ScheduleRow = { date: string; eveningSupervision: string[]; mealGuidance: string[]; remarks: string | null };

type SupervisionMealCalendarProps = {
  initialEvents: CalendarEvent[];
  title: string;
  description: string;
  currentTeacherName?: string;
  currentTeacherEmail?: string;
};

/** 해당 월의 평일(월~금) 날짜 목록 반환 */
function getWeekdaysOfMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) dates.push(date);
  }
  return dates;
}

/** 날짜 범위의 평일(월~금) 목록 반환 */
function getWeekdaysInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endTime = end.getTime();
  while (cur.getTime() <= endTime) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** 뷰 타입에 따른 표시할 날짜 목록 */
function getWeekdaysForView(viewDate: Date, viewType: string): Date[] {
  const y = viewDate.getFullYear();
  if (viewType === "semester1") {
    const start = new Date(y, 2, 1); // 3월 1일
    const end = new Date(y, 6, 31); // 7월 31일
    return getWeekdaysInRange(start, end);
  }
  if (viewType === "semester2") {
    const start = new Date(y, 7, 1); // 8월 1일
    const end = new Date(y + 1, 1, 28); // 다음해 2월 28일
    const lastDay = new Date(y + 1, 2, 0).getDate();
    end.setDate(lastDay);
    return getWeekdaysInRange(start, end);
  }
  return getWeekdaysOfMonth(y, viewDate.getMonth());
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 인쇄용 기간 라벨 */
function getPrintPeriodLabel(viewDate: Date, viewType: string): string {
  const y = viewDate.getFullYear();
  if (viewType === "semester1") return `${y}학년도 1학기 (3월~7월)`;
  if (viewType === "semester2") return `${y}학년도 2학기 (8월~2월)`;
  const m = viewDate.getMonth() + 1;
  return `${y}년 ${m}월`;
}

export default function SupervisionMealCalendar({
  initialEvents,
  title,
  description,
  currentTeacherName,
  currentTeacherEmail,
}: SupervisionMealCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [viewType, setViewType] = useState<string>("dayGridMonth");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleRow>>({});
  const [saving, setSaving] = useState(false);
  const [eveningCount, setEveningCount] = useState(1);
  const [mealCount, setMealCount] = useState(1);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<
    Array<{ row: number; date: string; mealGuidance: string; eveningSupervision: string; remarks: string }>
  | null>(null);
  const [csvErrors, setCsvErrors] = useState<Array<{ row: number; msg: string }>>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ inserted?: number; errors?: Array<{ row: number; msg: string }> } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [showCsvHelpTooltip, setShowCsvHelpTooltip] = useState(false);
  const router = useRouter();
  const { showToast } = useToastContext();

  const matchesCurrentTeacher = useCallback(
    (raw: string): boolean => {
      const value = raw?.trim().toLowerCase();
      if (!value) return false;

      const name = currentTeacherName?.trim().toLowerCase();
      const email = currentTeacherEmail?.trim().toLowerCase();

      if (name && value === name) return true;
      if (email && value === email) return true;
      return false;
    },
    [currentTeacherName, currentTeacherEmail]
  );

  const handleViewChange = useCallback((date: Date, vt: string) => {
    setViewDate(date);
    setViewType(vt || "dayGridMonth");
  }, []);

  const weekdaysOfMonth = useMemo(() => {
    return getWeekdaysForView(viewDate, viewType);
  }, [viewDate, viewType]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;

  /** 슬롯 설정/스케줄 fetch용 (학기 뷰일 때 해당 학기의 첫 달) */
  const configYear = year;
  const configMonth = viewType === "semester1" ? 3 : viewType === "semester2" ? 8 : month;

  useEffect(() => {
    fetch(`/api/academic-preparation/supervision-meal-config?year=${configYear}&month=${configMonth}`)
      .then((res) => res.json())
      .then((data) => {
        const e = Math.min(SLOT_MAX, Math.max(SLOT_MIN, Number(data.eveningCount) || 1));
        const m = Math.min(SLOT_MAX, Math.max(SLOT_MIN, Number(data.mealCount) || 1));
        setEveningCount(e);
        setMealCount(m);
      })
      .catch(() => {});
  }, [configYear, configMonth]);

  const saveSlotConfig = useCallback(
    async (ev: number, mg: number) => {
      try {
        const res = await fetch("/api/academic-preparation/supervision-meal-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: configYear, month: configMonth, eveningCount: ev, mealCount: mg }),
        });
        if (!res.ok) throw new Error("저장 실패");
      } catch {
        showToast("슬롯 설정 저장에 실패했습니다.", "error");
      }
    },
    [configYear, configMonth, showToast]
  );

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => res.json())
      .then((data) => setTeachers(data.teachers || []))
      .catch(() => setTeachers([]));
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      const pairs: { year: number; month: number }[] = [];
      if (viewType === "semester1") {
        for (let m = 3; m <= 7; m++) pairs.push({ year, month: m });
      } else if (viewType === "semester2") {
        for (let m = 8; m <= 12; m++) pairs.push({ year, month: m });
        pairs.push({ year: year + 1, month: 1 });
        pairs.push({ year: year + 1, month: 2 });
      } else {
        pairs.push({ year, month });
      }
      const results = await Promise.all(
        pairs.map(({ year: y, month: m }) =>
          fetch(`/api/academic-preparation/supervision-meal?year=${y}&month=${m}`).then((r) => r.json())
        )
      );
      const map: Record<string, ScheduleRow> = {};
      results.forEach((data) => {
        (data.schedules || []).forEach((s: ScheduleRow & { id?: string }) => {
          map[s.date] = {
            date: s.date,
            eveningSupervision: Array.isArray(s.eveningSupervision) ? s.eveningSupervision : [],
            mealGuidance: Array.isArray(s.mealGuidance) ? s.mealGuidance : [],
            remarks: s.remarks ?? null,
          };
        });
      });
      setScheduleMap(map);
    };
    fetchSchedules().catch(() => setScheduleMap({}));
  }, [year, month, viewType, scheduleRefreshKey]);

  const handleTeacherChange = useCallback(
    (dateStr: string, field: "eveningSupervision" | "mealGuidance", index: number, value: string) => {
      const v = value === "" ? "" : value;
      setScheduleMap((prev) => {
        const row = prev[dateStr] || {
          date: dateStr,
          eveningSupervision: [],
          mealGuidance: [],
          remarks: null,
        };
        const ev = [...(row.eveningSupervision || [])];
        const mg = [...(row.mealGuidance || [])];
        while (ev.length <= index) ev.push("");
        while (mg.length <= index) mg.push("");
        if (field === "eveningSupervision") ev[index] = v;
        else mg[index] = v;
        return {
          ...prev,
          [dateStr]: { ...row, eveningSupervision: ev, mealGuidance: mg },
        };
      });
    },
    []
  );

  const handleRemarksChange = useCallback(
    (dateStr: string, value: string) => {
      setScheduleMap((prev) => ({
        ...prev,
        [dateStr]: {
          ...(prev[dateStr] || {
            date: dateStr,
            eveningSupervision: [],
            mealGuidance: [],
            remarks: null,
          }),
          remarks: value || null,
        },
      }));
    },
    []
  );

  const dateExtraInfo = useMemo(() => {
    const map: Record<string, { eveningSupervision: string[]; mealGuidance: string[] }> = {};
    Object.entries(scheduleMap).forEach(([dateStr, row]) => {
      const ev = (row.eveningSupervision ?? []).filter(Boolean);
      const mg = (row.mealGuidance ?? []).filter(Boolean);
      if (ev.length > 0 || mg.length > 0) {
        map[dateStr] = { eveningSupervision: row.eveningSupervision ?? [], mealGuidance: row.mealGuidance ?? [] };
      }
    });
    return map;
  }, [scheduleMap]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const promises = weekdaysOfMonth.map((date) => {
        const dateStr = toDateString(date);
        const row = scheduleMap[dateStr];
        const ev = row?.eveningSupervision ?? [];
        const mg = row?.mealGuidance ?? [];
        const pad = (arr: string[], len: number) =>
          [...arr, ...Array(Math.max(0, len - arr.length)).fill("")].slice(0, len);
        const payload = {
          date: dateStr,
          eveningSupervision: pad(ev, eveningCount),
          mealGuidance: pad(mg, mealCount),
          remarks: row?.remarks ?? null,
        };
        return fetch("/api/academic-preparation/supervision-meal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      });
      const results = await Promise.all(promises);
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const data = await failed.json();
        throw new Error(data.error || "저장 실패");
      }
      showToast("저장되었습니다.", "success");
    } catch (err: any) {
      showToast(err?.message || "저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }, [weekdaysOfMonth, scheduleMap, eveningCount, mealCount, showToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /** 현재 테이블에 보여지는 데이터를 CSV 형식으로 생성 */
  const generateCsvFromCurrentData = useCallback(() => {
    const escapeCsvCell = (val: string): string => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const headers = [
      "날짜",
      ...Array.from({ length: mealCount }, (_, i) => `급식지도${i + 1}`),
      ...Array.from({ length: eveningCount }, (_, i) => `야자감독${i + 1}`),
      "비고",
    ];
    const rows = weekdaysOfMonth.map((date) => {
      const dateStr = toDateString(date);
      const row = scheduleMap[dateStr];
      const mg = row?.mealGuidance ?? [];
      const ev = row?.eveningSupervision ?? [];
      const cells = [
        dateStr,
        ...Array.from({ length: mealCount }, (_, i) => mg[i] ?? ""),
        ...Array.from({ length: eveningCount }, (_, i) => ev[i] ?? ""),
        row?.remarks ?? "",
      ];
      return cells.map(escapeCsvCell).join(",");
    });
    return `${headers.join(",")}\n${rows.join("\n")}\n`;
  }, [weekdaysOfMonth, scheduleMap, mealCount, eveningCount]);

  const downloadCsvTemplate = useCallback(() => {
    const BOM = "\uFEFF";
    const csv = generateCsvFromCurrentData();
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const periodLabel =
      viewType === "semester1"
        ? `${year}학년도1학기`
        : viewType === "semester2"
          ? `${year}학년도2학기`
          : `${year}-${String(month).padStart(2, "0")}`;
    a.download = `supervision_meal_${periodLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [generateCsvFromCurrentData, viewType, year, month]);

  const handleCsvFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const text = String(reader.result ?? "");
        setCsvText(text);
        setCsvLoading(true);
        setCsvResult(null);
        try {
          const resp = await fetch("/api/academic-preparation/supervision-meal/bulk-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csvText: text, preview: true }),
          });
          const data = await resp.json();
          setCsvPreview(data.preview ?? null);
          setCsvErrors(data.errors ?? []);
        } catch {
          setCsvErrors([{ row: 0, msg: "미리보기 요청 실패" }]);
          setCsvPreview(null);
        } finally {
          setCsvLoading(false);
        }
      };
      reader.readAsText(file, "utf-8");
    },
    []
  );

  const handleCsvUpload = useCallback(async () => {
    if (!csvText) return;
    setCsvLoading(true);
    try {
      const resp = await fetch("/api/academic-preparation/supervision-meal/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, preview: false }),
      });
      const data = await resp.json();
      setCsvResult(data);
      if (data.inserted != null && data.inserted > 0) {
        showToast(`${data.inserted}건이 저장되었습니다.`, "success");
        setCsvText(null);
        setCsvPreview(null);
        setCsvErrors([]);
        setScheduleRefreshKey((k) => k + 1);
        router.refresh();
      }
      if (data.errors?.length) {
        setCsvErrors(data.errors);
      }
    } catch {
      showToast("업로드에 실패했습니다.", "error");
    } finally {
      setCsvLoading(false);
    }
  }, [csvText, showToast, router]);

  return (
    <div className="space-y-6">
      {/* 화면에만 보이는 영역 (인쇄 시 숨김) */}
      <div className="mb-4 print:hidden flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">급식지도/야자감독</h2>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span className="italic">
              급식지도/야자감독 일정을 CSV로 대량 업로드 할 수 있습니다.
            </span>
            <div
              className="relative cursor-help"
              onMouseEnter={() => setShowCsvHelpTooltip(true)}
              onMouseLeave={() => setShowCsvHelpTooltip(false)}
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
              {showCsvHelpTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                  템플릿에서 명단을 빈칸으로 두면 기존 data에 영향을 주지 않습니다.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadCsvTemplate} type="button">
            템플릿 다운
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" size="sm" type="button" onClick={() => csvInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1.5" />
              CSV 업로드
            </Button>
          </label>
        </div>
      </div>

      {/* 인쇄 시에만 보이는 영역 */}
      <div className="hidden print:block print-schedule-wrapper">
        <h1 className="text-xl font-bold text-gray-900 mb-1">급식지도/야자감독 일정</h1>
        <p className="text-sm text-gray-600 mb-4">{getPrintPeriodLabel(viewDate, viewType)}</p>
        <table className="w-full border-collapse text-sm print-schedule-table" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 px-2 font-semibold text-gray-900 w-10">순</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 w-24">날짜</th>
              {Array.from({ length: mealCount }).map((_, i) => (
                <th key={`mg-${i}`} className="text-left py-2 px-2 font-semibold text-gray-900 bg-amber-100">
                  급식지도 {i + 1}
                </th>
              ))}
              {Array.from({ length: eveningCount }).map((_, i) => (
                <th key={`ev-${i}`} className="text-left py-2 px-2 font-semibold text-gray-900 bg-sky-100">
                  야자감독 {i + 1}
                </th>
              ))}
              <th className="text-left py-2 px-2 font-semibold text-gray-900">비고</th>
            </tr>
          </thead>
          <tbody>
            {weekdaysOfMonth.map((date, index) => {
              const dayOfWeek = date.getDay();
              const weekdayLabel = WEEKDAY_LABELS[dayOfWeek] ?? "";
              const dateStr = toDateString(date);
              const displayDateStr = `${date.getMonth() + 1}/${date.getDate()} (${weekdayLabel})`;
              const row = scheduleMap[dateStr];
              return (
                <tr key={date.toISOString()} className="border-b border-gray-300">
                  <td className="py-2 px-2 text-gray-700">{index + 1}</td>
                  <td className="py-2 px-2 text-gray-900">{displayDateStr}</td>
                  {Array.from({ length: mealCount }).map((_, i) => {
                    const mg = row?.mealGuidance ?? [];
                    const val = mg[i] ?? "";
                    return (
                      <td key={`mg-${i}`} className="py-2 px-2 bg-amber-50">
                        {val ? (
                          <span
                            className={
                              matchesCurrentTeacher(String(val))
                                ? "inline-flex items-center rounded-full bg-orange-100 text-orange-800 text-base px-2 py-0.5 font-semibold"
                                : undefined
                            }
                          >
                            {val}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                  {Array.from({ length: eveningCount }).map((_, i) => {
                    const ev = row?.eveningSupervision ?? [];
                    const val = ev[i] ?? "";
                    return (
                      <td key={`ev-${i}`} className="py-2 px-2 bg-sky-50">
                        {val ? (
                          <span
                            className={
                              matchesCurrentTeacher(String(val))
                                ? "inline-flex items-center rounded-full bg-orange-100 text-orange-800 text-xs px-2 py-0.5 font-semibold"
                                : undefined
                            }
                          >
                            {val}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-gray-700">{row?.remarks ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row items-stretch print:hidden">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:w-1/2">
          <CalendarView
            initialEvents={events}
            onEventsChange={setEvents}
            onViewChange={handleViewChange}
            hideAddButton={true}
            dateExtraInfo={dateExtraInfo}
            currentTeacherName={currentTeacherName}
            currentTeacherEmail={currentTeacherEmail}
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:flex-1 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
              <span className="flex items-center gap-2">
                급식지도
                <div className="inline-flex items-center border border-gray-300 rounded-md bg-white overflow-hidden w-12">
                  <span className="flex-1 text-sm text-center py-0.5">{mealCount}</span>
                  <div className="flex flex-col border-l border-gray-300">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(SLOT_MAX, mealCount + 1);
                        setMealCount(next);
                        saveSlotConfig(eveningCount, next);
                      }}
                      disabled={saving || mealCount >= SLOT_MAX}
                      className="p-0.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ChevronUp className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(SLOT_MIN, mealCount - 1);
                        setMealCount(next);
                        saveSlotConfig(eveningCount, next);
                      }}
                      disabled={saving || mealCount <= SLOT_MIN}
                      className="p-0.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>
              </span>
              <span>/</span>
              <span className="flex items-center gap-2">
                야자감독
                <div className="inline-flex items-center border border-gray-300 rounded-md bg-white overflow-hidden w-12">
                  <span className="flex-1 text-sm text-center py-0.5">{eveningCount}</span>
                  <div className="flex flex-col border-l border-gray-300">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(SLOT_MAX, eveningCount + 1);
                        setEveningCount(next);
                        saveSlotConfig(next, mealCount);
                      }}
                      disabled={saving || eveningCount >= SLOT_MAX}
                      className="p-0.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ChevronUp className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(SLOT_MIN, eveningCount - 1);
                        setEveningCount(next);
                        saveSlotConfig(next, mealCount);
                      }}
                      disabled={saving || eveningCount <= SLOT_MIN}
                      className="p-0.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>
              </span>
              <span>일정</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={handlePrint} type="button">
                <Printer className="w-4 h-4 mr-1.5" />
                인쇄
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 w-12">순</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 w-20">날짜</th>
                  {Array.from({ length: mealCount }).map((_, i) => (
                    <th key={`mg-${i}`} className="text-left py-3 px-2 text-sm font-semibold text-gray-700 bg-amber-50">
                      급식지도 {i + 1}
                    </th>
                  ))}
                  {Array.from({ length: eveningCount }).map((_, i) => (
                    <th key={`ev-${i}`} className="text-left py-3 px-2 text-sm font-semibold text-gray-700 bg-sky-50">
                      야자감독 {i + 1}
                    </th>
                  ))}
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">비고</th>
                </tr>
              </thead>
              <tbody>
                {weekdaysOfMonth.map((date, index) => {
                  const dayOfWeek = date.getDay();
                  const weekdayLabel = WEEKDAY_LABELS[dayOfWeek] ?? "";
                  const dateStr = toDateString(date);
                  const displayDateStr = `${date.getMonth() + 1}/${date.getDate()} (${weekdayLabel})`;
                  const row = scheduleMap[dateStr];
                  const inputClass =
                    "w-full min-w-0 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60";
                  return (
                    <tr key={date.toISOString()} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2 px-2 text-sm text-gray-700">{index + 1}</td>
                      <td className="py-2 px-2 text-sm text-gray-900 w-20">{displayDateStr}</td>
                      {Array.from({ length: mealCount }).map((_, i) => {
                        const mg = row?.mealGuidance ?? [];
                        const val = mg[i] ?? "";
                        return (
                          <td key={`mg-${i}`} className="py-1 px-2 bg-amber-50">
                            <TeacherAutocomplete
                              value={val}
                              onChange={(v) => handleTeacherChange(dateStr, "mealGuidance", i, v)}
                              teachers={teachers}
                              placeholder="교사 선택"
                              disabled={saving}
                              className="w-1/2 min-w-[80px]"
                            />
                          </td>
                        );
                      })}
                      {Array.from({ length: eveningCount }).map((_, i) => {
                        const ev = row?.eveningSupervision ?? [];
                        const val = ev[i] ?? "";
                        return (
                          <td key={`ev-${i}`} className="py-1 px-2 bg-sky-50">
                            <TeacherAutocomplete
                              value={val}
                              onChange={(v) => handleTeacherChange(dateStr, "eveningSupervision", i, v)}
                              teachers={teachers}
                              placeholder="교사 선택"
                              disabled={saving}
                              className="w-1/2 min-w-[80px]"
                            />
                          </td>
                        );
                      })}
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={row?.remarks ?? ""}
                          onChange={(e) => handleRemarksChange(dateStr, e.target.value)}
                          disabled={saving}
                          placeholder="비고"
                          className={inputClass}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {csvLoading && (
            <p className="text-sm text-gray-500 mt-2">CSV 처리 중...</p>
          )}
          {csvErrors.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              {csvErrors.slice(0, 5).map((e) => (
                <div key={e.row}>
                  {e.row}행: {e.msg}
                </div>
              ))}
              {csvErrors.length > 5 && <div>...외 {csvErrors.length - 5}건</div>}
            </div>
          )}
          {csvPreview && csvPreview.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="max-h-40 overflow-auto border rounded p-2 bg-gray-50">
                <table className="text-sm w-full">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">날짜</th>
                      <th className="text-left">급식지도</th>
                      <th className="text-left">야자감독</th>
                      <th className="text-left">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 20).map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.date}</td>
                        <td>{r.mealGuidance}</td>
                        <td>{r.eveningSupervision}</td>
                        <td>{r.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCsvText(null);
                    setCsvPreview(null);
                    setCsvErrors([]);
                    setCsvResult(null);
                    if (csvInputRef.current) csvInputRef.current.value = "";
                  }}
                  disabled={csvLoading}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCsvUpload}
                  disabled={csvLoading || csvErrors.length > 0}
                >
                  업로드 확인
                </Button>
              </div>
            </div>
          )}
          {csvResult && csvResult.inserted != null && csvResult.inserted > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {csvResult.inserted}건 저장됨
              {csvResult.errors?.length ? `, ${csvResult.errors.length}건 오류` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
