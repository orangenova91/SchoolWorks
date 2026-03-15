/** 학적 상태 옵션 (저장/표시 동일) */
export const ENROLLMENT_STATUS_OPTIONS = ["재학", "자퇴", "위탁", "퇴학", "휴학", "졸업", "전출"] as const;

/** 학적 상태별 배지 Tailwind 클래스 */
export const ENROLLMENT_STATUS_BADGE_CLASS: Record<string, string> = {
  재학: "bg-green-100 text-green-800",
  자퇴: "bg-gray-300 text-gray-800",
  위탁: "bg-purple-100 text-purple-800",
  퇴학: "bg-red-100 text-red-800",
  휴학: "bg-amber-100 text-amber-800",
  졸업: "bg-blue-100 text-blue-800",
  전출: "bg-gray-300 text-gray-800",
};
