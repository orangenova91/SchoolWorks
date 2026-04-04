/** 출결 작성 일자 자동 입력 — 등록/수정 폼 공통 */

export function isShortPeriodType(type: string) {
  return type === "조퇴" || type === "지각" || type === "결과";
}

function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function todayLocalYmd(): string {
  const n = new Date();
  return formatYmdLocal(new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0, 0));
}

/** ISO/DB 문자열을 로컬 달력 YYYY-MM-DD로 (date input용). */
export function toLocalDateInputValue(dateStr: string): string {
  if (!dateStr) return "";
  const part = dateStr.includes("T") ? dateStr.split("T")[0]! : dateStr.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(part);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return formatYmdLocal(new Date(y, mo - 1, d, 12, 0, 0, 0));
}

/** YYYY-MM-DD에 하루 더함 (로컬 달력). */
function addOneDayYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return formatYmdLocal(d);
}

/** 시작/종료일 +1일; 그날이 토·일이면 다음 월요일 (작성 일자 자동 입력용). */
export function addOneDaySkipWeekendYmd(ymd: string): string {
  const next = addOneDayYmd(ymd);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(next.trim());
  if (!m) return next;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return formatYmdLocal(d);
}
