"use client";

import { useState, useEffect, useRef, useMemo, type ComponentType } from "react";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Save, X, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { AVAILABLE_BANNER_ICONS, HelpCircle } from "@/components/dashboard/teacher/bannerIcons";
import {
  BANNER_COLUMNS,
  BANNER_MAX_ROWS,
} from "@/lib/bannerConstants";

const BANNER_SLOT_ID_PREFIX = "banner-slot-";

function bannerSlotId(index: number) {
  return `${BANNER_SLOT_ID_PREFIX}${index}`;
}

function parseBannerSlotIndex(id: string | number): number | null {
  const s = String(id);
  if (!s.startsWith(BANNER_SLOT_ID_PREFIX)) return null;
  const n = parseInt(s.slice(BANNER_SLOT_ID_PREFIX.length), 10);
  return Number.isFinite(n) ? n : null;
}

export type Banner = {
  icon: string;
  title: string;
  url: string;
};

type SortableBannerSlotProps = {
  id: string;
  index: number;
  banner: Banner;
  IconComponent: ComponentType<{ className?: string }>;
  openIconDropdownIndex: number | null;
  setOpenIconDropdownIndex: React.Dispatch<React.SetStateAction<number | null>>;
  iconDropdownRef: React.RefObject<HTMLDivElement | null>;
  onBannerChange: (index: number, field: keyof Banner, value: string) => void;
  onRemoveBanner: (index: number) => void;
};

function SortableBannerSlot({
  id,
  index,
  banner,
  IconComponent,
  openIconDropdownIndex,
  setOpenIconDropdownIndex,
  iconDropdownRef,
  onBannerChange,
  onRemoveBanner,
}: SortableBannerSlotProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-200 rounded-lg p-2 bg-white space-y-3"
     >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            className="touch-none shrink-0 -ml-2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`배너 ${index + 1} 위치 이동`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 truncate">
            배너 {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
            <IconComponent className="w-5 h-5 text-gray-600" />
          </div>
          <button
            type="button"
            onClick={() => onRemoveBanner(index)}
            className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label={`배너 ${index + 1} 삭제`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            아이콘
          </label>
          <div
            className="relative"
            ref={
              (openIconDropdownIndex === index ? iconDropdownRef : undefined) as
                | React.Ref<HTMLDivElement>
                | undefined
            }
          >
            <button
              type="button"
              onClick={() =>
                setOpenIconDropdownIndex((prev) => (prev === index ? null : index))
              }
              className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white flex items-center gap-2 text-left overflow-hidden"
            >
              <IconComponent className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="min-w-0 truncate">{banner.icon || "아이콘 선택"}</span>
            </button>
            {openIconDropdownIndex === index && (
              <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onBannerChange(index, "icon", "");
                    setOpenIconDropdownIndex(null);
                  }}
                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-100 text-gray-500 whitespace-nowrap"
                >
                  <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  아이콘 선택
                </button>
                {[...AVAILABLE_BANNER_ICONS]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((icon) => {
                    const IconItem = icon.component;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => {
                          onBannerChange(index, "icon", icon.name);
                          setOpenIconDropdownIndex(null);
                        }}
                        className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-100 text-gray-900"
                      >
                        <IconItem className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        {icon.name}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            type="text"
            value={banner.title}
            onChange={(e) => onBannerChange(index, "title", e.target.value)}
            placeholder="배너 제목"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            URL 주소
          </label>
          <input
            type="text"
            value={banner.url}
            onChange={(e) => onBannerChange(index, "url", e.target.value)}
            placeholder="/dashboard/teacher/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
}

interface BannerEditorProps {
  banners: Banner[];
  rows: number;
  onSave: (payload: { banners: Banner[]; rows: number }) => Promise<void>;
  onCancel: () => void;
}

export default function BannerEditor({
  banners,
  rows: initialRows,
  onSave,
  onCancel,
}: BannerEditorProps) {
  const [editedBanners, setEditedBanners] = useState<Banner[]>(banners);
  const [rows, setRows] = useState<number>(initialRows);
  const [isSaving, setIsSaving] = useState(false);
  const [openIconDropdownIndex, setOpenIconDropdownIndex] = useState<number | null>(null);
  const iconDropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (openIconDropdownIndex === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (iconDropdownRef.current && !iconDropdownRef.current.contains(e.target as Node)) {
        setOpenIconDropdownIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openIconDropdownIndex]);
  const { showToast } = useToast();

  const handleBannerChange = (index: number, field: keyof Banner, value: string) => {
    const updated = [...editedBanners];
    updated[index] = { ...updated[index], [field]: value };
    setEditedBanners(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ banners: editedBanners, rows });
      showToast("배너가 저장되었습니다.", "success");
    } catch (error) {
      showToast("배너 저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIncreaseRows = () => {
    if (rows >= BANNER_MAX_ROWS) {
      showToast(`배너 줄 수는 최대 ${BANNER_MAX_ROWS}줄까지 설정할 수 있습니다.`, "error");
      return;
    }
    setRows((prev) => prev + 1);
  };

  const handleRemoveBanner = (index: number) => {
    const updated = [...editedBanners];
    // 인덱스를 유지하면서 해당 위치를 비워서, 그리드 상 위치가 당겨지지 않도록 처리
    updated[index] = { icon: "", title: "", url: "" };
    setEditedBanners(updated);
  };

  const handleDecreaseRows = () => {
    if (rows <= 1) return;

    const newRows = rows - 1;
    const start = newRows * BANNER_COLUMNS;
    const end = rows * BANNER_COLUMNS;

    const hasContentInLastRow = editedBanners
      .slice(start, end)
      .some(
        (banner) =>
          banner &&
          ((banner.icon && banner.icon.trim() !== "") ||
            (banner.title && banner.title.trim() !== "") ||
            (banner.url && banner.url.trim() !== ""))
      );

    if (hasContentInLastRow) {
      showToast(
        "마지막 줄의 배너 내용을 모두 비워야 줄 수를 줄일 수 있습니다.",
        "error"
      );
      return;
    }

    setRows(newRows);
  };

  const slotCount = rows * BANNER_COLUMNS;

  const sortableIds = useMemo(
    () => Array.from({ length: slotCount }, (_, i) => bannerSlotId(i)),
    [slotCount]
  );

  const handleDragStart = () => {
    setOpenIconDropdownIndex(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIndex = parseBannerSlotIndex(active.id);
    const overIndex = parseBannerSlotIndex(over.id);
    if (activeIndex === null || overIndex === null || activeIndex === overIndex) {
      return;
    }

    setEditedBanners((prev) => {
      const next = [...prev];
      while (next.length < slotCount) {
        next.push({ icon: "", title: "", url: "" });
      }
      const head = arrayMove(next.slice(0, slotCount), activeIndex, overIndex);
      const tail = next.slice(slotCount);
      return [...head, ...tail];
    });
  };

  const getIconComponent = (iconName: string) => {
    const icon = AVAILABLE_BANNER_ICONS.find((i) => i.name === iconName);
    return icon ? icon.component : HelpCircle;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">배너 편집</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>줄 수</span>
            <button
              type="button"
              onClick={handleDecreaseRows}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs disabled:opacity-50"
              disabled={rows <= 1}
            >
              -
            </button>
            <span className="text-sm font-semibold text-gray-800">{rows}</span>
            <span className="text-[11px] text-gray-400">/ {BANNER_MAX_ROWS}</span>
            <button
              type="button"
              onClick={handleIncreaseRows}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs disabled:opacity-50"
              disabled={rows >= BANNER_MAX_ROWS}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: slotCount }, (_, index) => {
              const banner = editedBanners[index] ?? { icon: "", title: "", url: "" };
              const IconComponent = getIconComponent(banner.icon);
              return (
                <SortableBannerSlot
                  key={bannerSlotId(index)}
                  id={bannerSlotId(index)}
                  index={index}
                  banner={banner}
                  IconComponent={IconComponent}
                  openIconDropdownIndex={openIconDropdownIndex}
                  setOpenIconDropdownIndex={setOpenIconDropdownIndex}
                  iconDropdownRef={iconDropdownRef}
                  onBannerChange={handleBannerChange}
                  onRemoveBanner={handleRemoveBanner}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
