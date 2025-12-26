"use client";

import Link from "next/link";
import { Users, UserCog } from "lucide-react";

type RosterToggleProps = {
  currentPage: "staff" | "students";
};

export function RosterToggle({ currentPage }: RosterToggleProps) {
  return (
    <div className="mb-4">
      <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
        <Link
          href="/dashboard/teacher/students"
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentPage === "students"
              ? "text-white bg-blue-600"
              : "text-gray-700 hover:text-gray-900"
          }`}
        >
          <Users className="w-4 h-4" />
          학생 명렬
        </Link>
        <Link
          href="/dashboard/teacher/staff"
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentPage === "staff"
              ? "text-white bg-blue-600"
              : "text-gray-700 hover:text-gray-900"
          }`}
        >
          <UserCog className="w-4 h-4" />
          교직원 명렬
        </Link>
      </div>
    </div>
  );
}

