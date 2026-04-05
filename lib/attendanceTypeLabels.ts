/** 기존 DB 값("질병" 등) 및 신규 값("결석 (질병)" 등) 표시용 라벨 */
export const ATTENDANCE_TYPE_LABELS: Record<string, string> = {
  질병: "결석 (질병)",
  인정: "결석 (인정)",
  기타: "결석 (기타)",
  "결석 (질병)": "결석 (질병)",
  "결석 (인정)": "결석 (인정)",
  "결석 (기타)": "결석 (기타)",
  조퇴: "조퇴",
  지각: "지각",
  결과: "결과",
};

export function labelAttendanceType(type: string): string {
  return ATTENDANCE_TYPE_LABELS[type] ?? type;
}
