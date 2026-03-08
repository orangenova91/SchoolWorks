type SupervisionMealMap = Record<
  string,
  { eveningSupervision: string[]; mealGuidance: string[] }
>;

type TodaySummaryBannerProps = {
  now: Date;
  isoToday: string;
  todaysGroupCount: number;
  teacherName?: string;
  teacherEmail?: string;
  supervisionMealMap: SupervisionMealMap;
};

export default function TodaySummaryBanner({
  now,
  isoToday,
  todaysGroupCount,
  teacherName = "",
  teacherEmail = "",
  supervisionMealMap,
}: TodaySummaryBannerProps) {
  const matches = (s: string) => {
    const t = String(s).trim();
    return t && (t === teacherName || t === teacherEmail);
  };

  const todayDate = new Date(isoToday + "T00:00:00");
  const dayMs = 24 * 60 * 60 * 1000;

  let nextMeal: { diffDays: number } | null = null;
  let nextYa: { diffDays: number } | null = null;

  Object.entries(supervisionMealMap).forEach(([dateStr, duty]) => {
    const dutyDate = new Date(dateStr + "T00:00:00");
    const diffMs = dutyDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffMs / dayMs);

    if (diffDays < 0 || diffDays > 7) return;

    const hasYa = (duty.eveningSupervision || []).some(matches);
    const hasMeal = (duty.mealGuidance || []).some(matches);

    if (hasMeal && (!nextMeal || diffDays < nextMeal.diffDays)) {
      nextMeal = { diffDays };
    }
    if (hasYa && (!nextYa || diffDays < nextYa.diffDays)) {
      nextYa = { diffDays };
    }
  });

  const showDuty =
    (teacherName || teacherEmail) && (nextMeal !== null || nextYa !== null);
  const dDayLabel = (d: number) => (d === 0 ? "D-day" : `D-${d}`);
  const mealLabel = nextMeal !== null ? dDayLabel(nextMeal.diffDays) : null;
  const yaLabel = nextYa !== null ? dDayLabel(nextYa.diffDays) : null;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 whitespace-nowrap">
      오늘은{" "}
      <span className="inline-block mx-1 px-2 py-1 text-xl font-bold text-blue-900 bg-blue-200 rounded-md">
        {new Intl.DateTimeFormat("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "2-digit",
          day: "2-digit",
          weekday: "long",
        }).format(now)}{" "}
      </span>
      입니다. 오늘 선생님의 수업은{" "}
      <span className="inline-block mx-1 px-2 py-1 text-xl font-bold text-blue-900 bg-blue-200 rounded-md">
        {todaysGroupCount}개
      </span>{" "}
      입니다.
      {showDuty && (
        <>
          {" "}
          다음{" "}
          {nextMeal !== null && (
            <span>
              <span className="inline-block mx-0.5 px-2 py-1 text-sm font-semibold text-orange-900 bg-blue-100 rounded-md">
                급식지도
              </span>
              <span className="inline-block mx-0.5 px-2 py-1 text-sm font-bold text-orange-900 bg-orange-100 rounded-md">
                {mealLabel}
              </span>
            </span>
          )}
          {nextMeal !== null && nextYa !== null && ", "}
          {nextYa !== null && (
            <span>
              <span className="inline-block mx-0.5 px-2 py-1 text-sm font-semibold text-orange-900 bg-blue-100 rounded-md">
                야자감독
              </span>
              <span className="inline-block mx-0.5 px-2 py-1 text-sm font-bold text-orange-900 bg-orange-100 rounded-md">
                {yaLabel}
              </span>
            </span>
          )}
          입니다.
        </>
      )}
    </div>
  );
}
