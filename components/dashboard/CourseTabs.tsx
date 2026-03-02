"use client";

import { useState, useEffect } from "react";

type Tab = {
  id: string;
  label: string;
};

type CourseTabsProps = {
  tabs: Tab[];
  children: React.ReactNode[]; // panels in the same order as tabs
  /** 초기 활성 탭 ID (URL query와 연동) */
  initialTabId?: string;
};

export default function CourseTabs({ tabs, children, initialTabId }: CourseTabsProps) {
  const resolvedIndex = initialTabId
    ? Math.max(0, tabs.findIndex((t) => t.id === initialTabId))
    : 0;
  const [activeIndex, setActiveIndex] = useState(
    resolvedIndex >= 0 ? resolvedIndex : 0
  );

  useEffect(() => {
    if (initialTabId && resolvedIndex >= 0) {
      setActiveIndex(resolvedIndex);
    }
  }, [initialTabId, resolvedIndex]);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="수업 기능 탭"
        className="flex gap-2 border-b border-gray-200 print:hidden"
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveIndex(index)}
              className={[
                "px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                isActive
                  ? "text-blue-700 bg-white border border-gray-200 border-b-white"
                  : "text-gray-600 hover:text-blue-700",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${tabs[activeIndex]?.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${tabs[activeIndex]?.id}`}
      >
        {Array.isArray(children) ? children[activeIndex] : children}
      </div>
    </div>
  );
}

