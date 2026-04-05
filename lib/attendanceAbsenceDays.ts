/** ISO/날짜 문자열을 로컬 달력 날짜로 파싱 (정오 기준으로 하루 단위 반복 시 DST 이슈 완화). */
function parseDateForCalendar(dateStr: string): Date {
  const part = dateStr.includes("T") ? dateStr.split("T")[0]! : dateStr.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(part);
  if (!m) return new Date(dateStr);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/** 시작일~종료일(포함) 사이의 평일(월~금) 일수. 토·일은 제외. */
export function getWeekdayAbsenceDayCount(startDate: string, endDate: string): number {
  const start = parseDateForCalendar(startDate);
  const end = parseDateForCalendar(endDate);
  if (start > end) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
