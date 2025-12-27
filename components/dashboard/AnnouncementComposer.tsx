"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Quote, Link as LinkIcon, Undo, Redo, Heading2, Send, ChevronDown, X, Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const targetOptions = [
  { value: "students", label: "모든 재학생" },
  { value: "parents", label: "모든 학부모" },
];

const categoryOptions = [
  { value: "", label: "선택 안함" },
  { value: "notice", label: "단순 알림" },
  { value: "survey", label: "설문 조사" },
  { value: "consent", label: "동의서" },
];

// 선택된 대상들을 audience 값으로 변환
const convertTargetsToAudience = (selectedTargets: string[]): string => {
  if (selectedTargets.length === 0) return "";
  if (selectedTargets.length === 1) {
    return selectedTargets[0] === "students" ? "all" : selectedTargets[0];
  }
  // 여러 개 선택된 경우 첫 번째 값을 사용 (하위 호환성)
  return selectedTargets[0] === "students" ? "all" : selectedTargets[0];
};

// audience 값을 선택된 대상들로 변환
const convertAudienceToTargets = (audience: string): string[] => {
  if (!audience) return [];
  if (audience === "all" || audience.startsWith("grade-")) {
    return ["students"];
  }
  if (audience === "parents" || audience === "teachers") {
    return [audience];
  }
  return [];
};

interface SelectedClass {
  grade: string;
  classNumber: string;
}

const GRADES = ["1", "2", "3"];
const CLASS_NUMBERS = Array.from({ length: 7 }, (_, i) => 
  String(i + 1).padStart(2, "0")
);

const getDefaultPublishAt = () =>
  new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

interface AnnouncementComposerPayload {
  title: string;
  category?: string;
  audience: string;
  author: string;
  content: string;
  isScheduled: boolean;
  publishAt?: string;
  selectedClasses?: SelectedClass[];
  parentSelectedClasses?: SelectedClass[];
}

interface AnnouncementComposerProps {
  authorName: string;
  onPreview?: (payload: AnnouncementComposerPayload) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showButton?: boolean;
  editId?: string; // 수정 모드일 때 공지사항 ID
  onEditComplete?: () => void; // 수정 완료 후 콜백
}

export function AnnouncementComposer({ authorName, onPreview, isOpen: controlledIsOpen, onOpenChange, showButton = true, editId, onEditComplete }: AnnouncementComposerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // 외부에서 제어하는 경우와 내부에서 제어하는 경우 모두 지원
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  if (!isOpen) {
    if (!showButton) {
      return null;
    }
    return (
      <Button onClick={() => setIsOpen(true)}>
        글쓰기
      </Button>
    );
  }

  return <AnnouncementComposerForm authorName={authorName} onPreview={onPreview} onClose={() => setIsOpen(false)} editId={editId} onEditComplete={onEditComplete} />;
}

function AnnouncementComposerForm({
  authorName,
  onPreview,
  onClose,
  editId,
  onEditComplete,
}: AnnouncementComposerProps & { onClose: () => void; editId?: string; onEditComplete?: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
  const [parentSelectedClasses, setParentSelectedClasses] = useState<SelectedClass[]>([]);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [useSchedule, setUseSchedule] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!editId);
  const targetModalRef = useRef<HTMLDivElement>(null);
  const classSelectionRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({
        placeholder: "공지 내용을 입력하세요...",
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500",
      },
    },
    content: "",
    immediatelyRender: false,
  });

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (editId && editor) {
      const loadAnnouncement = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/announcements/${editId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "공지사항을 불러오는데 실패했습니다.");
          }

          const announcement = data.announcement;
          setTitle(announcement.title);
          setCategory(announcement.category || "");
          setSelectedTargets(convertAudienceToTargets(announcement.audience));
          // 선택된 학급 정보 로드 (있는 경우)
          if (announcement.selectedClasses) {
            try {
              const classes = typeof announcement.selectedClasses === 'string' 
                ? JSON.parse(announcement.selectedClasses) 
                : announcement.selectedClasses;
              setSelectedClasses(Array.isArray(classes) ? classes : []);
            } catch (e) {
              setSelectedClasses([]);
            }
          } else {
            setSelectedClasses([]);
          }
          // 학부모용 선택된 학급 정보 로드 (있는 경우)
          if (announcement.parentSelectedClasses) {
            try {
              const classes = typeof announcement.parentSelectedClasses === 'string' 
                ? JSON.parse(announcement.parentSelectedClasses) 
                : announcement.parentSelectedClasses;
              setParentSelectedClasses(Array.isArray(classes) ? classes : []);
            } catch (e) {
              setParentSelectedClasses([]);
            }
          } else {
            setParentSelectedClasses([]);
          }
          setUseSchedule(announcement.isScheduled);
          setPublishAt(announcement.publishAt ? new Date(announcement.publishAt).toISOString().slice(0, 16) : "");
          editor.commands.setContent(announcement.content);
        } catch (err: any) {
          console.error("Failed to load announcement:", err);
          setError(err.message || "공지사항을 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      };

      loadAnnouncement();
    }
  }, [editId, editor]);

  // ESC 키로 모달 닫기 및 body 스크롤 방지
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isTargetModalOpen) {
        setIsTargetModalOpen(false);
      }
    };

    if (isTargetModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isTargetModalOpen]);

  // 알림 대상 모달 열기/닫기 핸들러
  const handleTargetModalToggle = () => {
    setIsTargetModalOpen(prev => !prev);
  };

  // 제목이 비어있거나 알림 대상이 없거나 제출 중일 때 비활성화
  const hasTitle = title.trim().length > 0;
  const hasTargets = selectedTargets.length > 0;
  const isDisabled = !hasTitle || !hasTargets || isSubmitting;

  // 모든 학반 조합 생성
  const getAllClasses = (): SelectedClass[] => {
    const allClasses: SelectedClass[] = [];
    GRADES.forEach((grade) => {
      CLASS_NUMBERS.forEach((classNumber) => {
        allClasses.push({ grade, classNumber });
      });
    });
    return allClasses;
  };

  // 모든 학반이 선택되었는지 확인
  const isAllClassesSelected = (classes: SelectedClass[]): boolean => {
    const allClasses = getAllClasses();
    if (classes.length !== allClasses.length) return false;
    return allClasses.every((cls) =>
      classes.some((c) => c.grade === cls.grade && c.classNumber === cls.classNumber)
    );
  };

  // 체크박스 refs
  const studentsCheckboxRef = useRef<HTMLInputElement>(null);
  const parentsCheckboxRef = useRef<HTMLInputElement>(null);

  // 체크박스 indeterminate 상태 설정
  useEffect(() => {
    if (studentsCheckboxRef.current) {
      const allSelected = isAllClassesSelected(selectedClasses);
      const someSelected = selectedClasses.length > 0 && !allSelected;
      studentsCheckboxRef.current.indeterminate = someSelected;
    }
    if (parentsCheckboxRef.current) {
      const allSelected = isAllClassesSelected(parentSelectedClasses);
      const someSelected = parentSelectedClasses.length > 0 && !allSelected;
      parentsCheckboxRef.current.indeterminate = someSelected;
    }
  }, [selectedClasses, parentSelectedClasses]);

  // 대상 선택 핸들러
  const handleTargetToggle = (value: string) => {
    if (value === "students") {
      const allSelected = isAllClassesSelected(selectedClasses);
      if (allSelected) {
        // 모두 선택된 경우 -> 모두 해제
        setSelectedClasses([]);
        setSelectedTargets(selectedTargets.filter(t => t !== value));
      } else {
        // 일부 선택되었거나 선택되지 않은 경우 -> 모두 선택
        setSelectedClasses(getAllClasses());
        if (!selectedTargets.includes(value)) {
          setSelectedTargets([...selectedTargets, value]);
        }
      }
    } else if (value === "parents") {
      const allSelected = isAllClassesSelected(parentSelectedClasses);
      if (allSelected) {
        // 모두 선택된 경우 -> 모두 해제
        setParentSelectedClasses([]);
        setSelectedTargets(selectedTargets.filter(t => t !== value));
      } else {
        // 일부 선택되었거나 선택되지 않은 경우 -> 모두 선택
        setParentSelectedClasses(getAllClasses());
        if (!selectedTargets.includes(value)) {
          setSelectedTargets([...selectedTargets, value]);
        }
      }
    } else {
      // 기타 경우 (현재는 없지만 확장 가능성)
      if (selectedTargets.includes(value)) {
        setSelectedTargets(selectedTargets.filter(t => t !== value));
      } else {
        setSelectedTargets([...selectedTargets, value]);
      }
    }
  };

  // 학급 선택/해제 핸들러
  const handleClassToggle = (grade: string, classNumber: string) => {
    const exists = selectedClasses.some(
      (c) => c.grade === grade && c.classNumber === classNumber
    );

    if (exists) {
      // 선택 해제
      const newClasses = selectedClasses.filter(
        (c) => !(c.grade === grade && c.classNumber === classNumber)
      );
      setSelectedClasses(newClasses);
      // 선택된 학급이 없으면 재학생 타겟도 해제
      if (newClasses.length === 0 && selectedTargets.includes("students")) {
        setSelectedTargets(selectedTargets.filter(t => t !== "students"));
      }
    } else {
      // 선택 추가
      setSelectedClasses([...selectedClasses, { grade, classNumber }]);
      // 학급 선택 시 자동으로 재학생 타겟도 선택
      if (!selectedTargets.includes("students")) {
        setSelectedTargets([...selectedTargets, "students"]);
      }
    }
  };

  // 학년 전체 선택/해제
  const handleGradeToggle = (grade: string) => {
    const gradeClasses = CLASS_NUMBERS.map(cn => ({ grade, classNumber: cn }));
    const allSelected = gradeClasses.every(gc =>
      selectedClasses.some(sc => sc.grade === gc.grade && sc.classNumber === gc.classNumber)
    );

    if (allSelected) {
      // 모두 해제
      const newClasses = selectedClasses.filter(
        c => !(c.grade === grade)
      );
      setSelectedClasses(newClasses);
      // 선택된 학급이 없으면 재학생 타겟도 해제
      if (newClasses.length === 0 && selectedTargets.includes("students")) {
        setSelectedTargets(selectedTargets.filter(t => t !== "students"));
      }
    } else {
      // 모두 선택
      const newClasses = gradeClasses.filter(gc =>
        !selectedClasses.some(sc => sc.grade === gc.grade && sc.classNumber === gc.classNumber)
      );
      setSelectedClasses([...selectedClasses, ...newClasses]);
      // 학급 선택 시 자동으로 재학생 타겟도 선택
      if (!selectedTargets.includes("students")) {
        setSelectedTargets([...selectedTargets, "students"]);
      }
    }
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allClasses: SelectedClass[] = [];
    GRADES.forEach(grade => {
      CLASS_NUMBERS.forEach(classNumber => {
        allClasses.push({ grade, classNumber });
      });
    });
    setSelectedClasses(allClasses);
  };

  const handleClearAll = () => {
    setSelectedClasses([]);
    // 모두 지울 때 재학생 타겟도 해제
    if (selectedTargets.includes("students")) {
      setSelectedTargets(selectedTargets.filter(t => t !== "students"));
    }
  };

  // 특정 학급이 선택되었는지 확인
  const isClassSelected = (grade: string, classNumber: string) => {
    return selectedClasses.some(
      c => c.grade === grade && c.classNumber === classNumber
    );
  };

  // 특정 학년의 모든 반이 선택되었는지 확인
  const isGradeAllSelected = (grade: string) => {
    return CLASS_NUMBERS.every(classNumber =>
      isClassSelected(grade, classNumber)
    );
  };

  // 학부모용 학급 선택/해제 핸들러
  const handleParentClassToggle = (grade: string, classNumber: string) => {
    const exists = parentSelectedClasses.some(
      (c) => c.grade === grade && c.classNumber === classNumber
    );

    if (exists) {
      // 선택 해제
      const newClasses = parentSelectedClasses.filter(
        (c) => !(c.grade === grade && c.classNumber === classNumber)
      );
      setParentSelectedClasses(newClasses);
      // 선택된 학급이 없으면 학부모 타겟도 해제
      if (newClasses.length === 0 && selectedTargets.includes("parents")) {
        setSelectedTargets(selectedTargets.filter(t => t !== "parents"));
      }
    } else {
      // 선택 추가
      setParentSelectedClasses([...parentSelectedClasses, { grade, classNumber }]);
      // 학급 선택 시 자동으로 학부모 타겟도 선택
      if (!selectedTargets.includes("parents")) {
        setSelectedTargets([...selectedTargets, "parents"]);
      }
    }
  };

  // 학부모용 학년 전체 선택/해제
  const handleParentGradeToggle = (grade: string) => {
    const gradeClasses = CLASS_NUMBERS.map(cn => ({ grade, classNumber: cn }));
    const allSelected = gradeClasses.every(gc =>
      parentSelectedClasses.some(sc => sc.grade === gc.grade && sc.classNumber === gc.classNumber)
    );

    if (allSelected) {
      const newClasses = parentSelectedClasses.filter(
        c => !(c.grade === grade)
      );
      setParentSelectedClasses(newClasses);
      // 선택된 학급이 없으면 학부모 타겟도 해제
      if (newClasses.length === 0 && selectedTargets.includes("parents")) {
        setSelectedTargets(selectedTargets.filter(t => t !== "parents"));
      }
    } else {
      const newClasses = gradeClasses.filter(gc =>
        !parentSelectedClasses.some(sc => sc.grade === gc.grade && sc.classNumber === gc.classNumber)
      );
      setParentSelectedClasses([...parentSelectedClasses, ...newClasses]);
      // 학급 선택 시 자동으로 학부모 타겟도 선택
      if (!selectedTargets.includes("parents")) {
        setSelectedTargets([...selectedTargets, "parents"]);
      }
    }
  };

  const handleParentClearAll = () => {
    setParentSelectedClasses([]);
    // 모두 지울 때 학부모 타겟도 해제
    if (selectedTargets.includes("parents")) {
      setSelectedTargets(selectedTargets.filter(t => t !== "parents"));
    }
  };

  // 학부모용 특정 학급이 선택되었는지 확인
  const isParentClassSelected = (grade: string, classNumber: string) => {
    return parentSelectedClasses.some(
      c => c.grade === grade && c.classNumber === classNumber
    );
  };

  // 학부모용 특정 학년의 모든 반이 선택되었는지 확인
  const isParentGradeAllSelected = (grade: string) => {
    return CLASS_NUMBERS.every(classNumber =>
      isParentClassSelected(grade, classNumber)
    );
  };

  // 선택된 대상 표시 텍스트
  const getTargetDisplayText = () => {
    if (selectedTargets.length === 0) {
      return "알림 대상을 선택하세요";
    }
    
    // 재학생 → 학부모 순서로 정렬
    const sortedTargets = [...selectedTargets].sort((a, b) => {
      if (a === "students") return -1;
      if (b === "students") return 1;
      return 0;
    });
    
    const texts = sortedTargets.map(target => {
      if (target === "students" && selectedClasses.length > 0) {
        // 모든 학반이 선택된 경우 (21개)
        if (selectedClasses.length === 21) {
          return `모든 재학생 (${selectedClasses.length}개 학급)`;
        }
        // 일부 학반만 선택된 경우
        return `재학생 (${selectedClasses.length}개 학급)`;
      }
      if (target === "parents" && parentSelectedClasses.length > 0) {
        // 모든 학반이 선택된 경우 (21개)
        if (parentSelectedClasses.length === 21) {
          return `모든 학부모 (${parentSelectedClasses.length}개 학급)`;
        }
        // 일부 학반만 선택된 경우
        return `학부모 (${parentSelectedClasses.length}개 학급)`;
      }
      // 학급이 선택되지 않은 경우 (기본 라벨 사용)
      const option = targetOptions.find(opt => opt.value === target);
      return option?.label;
    }).filter(Boolean);
    return texts.join(", ");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;

    const content = editor.getHTML();
    const plainText = editor.getText().trim();

    if (!plainText) {
      setError("공지 본문을 입력해주세요.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // 재학생이 선택되고 학급이 선택된 경우, 첫 번째 학급의 학년으로 audience 설정
    let audience = convertTargetsToAudience(selectedTargets);
    if (selectedTargets.includes("students") && selectedClasses.length > 0) {
      const firstGrade = selectedClasses[0].grade;
      audience = `grade-${firstGrade}`;
    }

    const payload: AnnouncementComposerPayload = {
      title: title.trim(),
      category: category || undefined,
      audience,
      author: authorName.trim(),
      content,
      isScheduled: useSchedule,
      publishAt: useSchedule ? publishAt : undefined,
      selectedClasses: selectedTargets.includes("students") ? selectedClasses : [],
      parentSelectedClasses: selectedTargets.includes("parents") ? parentSelectedClasses : [],
    };

    try {
      // publishAt을 ISO 형식으로 변환 (datetime-local 형식에서)
      const requestBody = {
        ...payload,
        publishAt: payload.publishAt
          ? new Date(payload.publishAt).toISOString()
          : undefined,
      };

      const url = editId ? `/api/announcements/${editId}` : "/api/announcements";
      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (editId ? "공지사항 수정에 실패했습니다." : "공지사항 생성에 실패했습니다."));
      }

      // 성공 시 콜백 호출
      onPreview?.(payload);
      onEditComplete?.();

      // 폼 초기화
      editor.commands.clearContent(true);
      setTitle("");
      setSelectedTargets([]);
      setSelectedClasses([]);
      setParentSelectedClasses([]);
      setUseSchedule(false);
      setPublishAt("");
      setIsSubmitting(false);

      // 폼 닫기
      onClose();
    } catch (err: any) {
      console.error(editId ? "Update announcement error:" : "Create announcement error:", err);
      setError(err.message || (editId ? "공지사항 수정 중 오류가 발생했습니다." : "공지사항 생성 중 오류가 발생했습니다."));
      setIsSubmitting(false);
    }
  };

  const toolbarItems =
    editor &&
    [
      {
        label: "굵게",
        icon: <Bold className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleBold().run(),
        active: editor.isActive("bold"),
      },
      {
        label: "기울임",
        icon: <Italic className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleItalic().run(),
        active: editor.isActive("italic"),
      },
      {
        label: "소제목",
        icon: <Heading2 className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        active: editor.isActive("heading", { level: 2 }),
      },
      {
        label: "불릿 리스트",
        icon: <List className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleBulletList().run(),
        active: editor.isActive("bulletList"),
      },
      {
        label: "번호 리스트",
        icon: <ListOrdered className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleOrderedList().run(),
        active: editor.isActive("orderedList"),
      },
      {
        label: "인용구",
        icon: <Quote className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleBlockquote().run(),
        active: editor.isActive("blockquote"),
      },
      {
        label: "링크",
        icon: <LinkIcon className="h-4 w-4" />,
        action: () => {
          const previousUrl = editor.getAttributes("link").href;
          const url = window.prompt("링크 주소를 입력하세요.", previousUrl);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        },
        active: editor.isActive("link"),
      },
      {
        label: "되돌리기",
        icon: <Undo className="h-4 w-4" />,
        action: () => editor.chain().focus().undo().run(),
      },
      {
        label: "다시하기",
        icon: <Redo className="h-4 w-4" />,
        action: () => editor.chain().focus().redo().run(),
      },
    ];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">공지사항을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            {editId ? "공지 수정" : "새 공지 작성"}
          </p>
          <h2 className="text-xl font-bold text-gray-900">{editId ? "공지 수정" : "공지 입력"}</h2>
          <p className="text-sm text-gray-500">제목과 대상을 지정한 뒤 본문을 자유롭게 작성할 수 있어요.</p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Select
              label="구분"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
          </div>
          <div className="flex-[3]">
            <Input
              label="제목"
              placeholder="예: 11월 학부모 상담 안내"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
          <Input label="작성자" value={authorName} readOnly />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              알림 대상
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={handleTargetModalToggle}
              className="w-full justify-start"
            >
              {selectedTargets.length === 0 ? "알림 대상을 선택하세요" : getTargetDisplayText()}
            </Button>

            {/* 알림 대상 선택 모달 */}
            {isTargetModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* 배경 오버레이 */}
                <div
                  className="absolute inset-0 bg-black/50 transition-opacity"
                  onClick={() => setIsTargetModalOpen(false)}
                />
                {/* 모달 컨텐츠 */}
                <div
                  ref={targetModalRef}
                  className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 모달 헤더 */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">알림 대상 선택</h3>
                    <button
                      type="button"
                      onClick={() => setIsTargetModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="닫기"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* 모달 본문 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {targetOptions.map((option) => (
                        <div key={option.value} className="border border-gray-200 rounded-lg p-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              ref={option.value === "students" ? studentsCheckboxRef : option.value === "parents" ? parentsCheckboxRef : null}
                              type="checkbox"
                              checked={option.value === "students" 
                                ? isAllClassesSelected(selectedClasses)
                                : option.value === "parents"
                                ? isAllClassesSelected(parentSelectedClasses)
                                : selectedTargets.includes(option.value)}
                              onChange={() => handleTargetToggle(option.value)}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            />
                            <span className="text-base font-medium text-gray-900">{option.label}</span>
                            {option.value === "students" && selectedTargets.includes("students") && selectedClasses.length > 0 && (
                              <span className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                                {selectedClasses.length}개 학급 선택됨
                              </span>
                            )}
                            {option.value === "parents" && selectedTargets.includes("parents") && parentSelectedClasses.length > 0 && (
                              <span className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                                {parentSelectedClasses.length}개 학급 선택됨
                              </span>
                            )}
                          </label>
                          
                          {/* 재학생 학급 선택 UI */}
                          {option.value === "students" && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700">대상 학급 선택</h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleClearAll}
                                  className="text-xs h-7 px-2"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  모두 지움
                                </Button>
                              </div>
                              
                              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-sm">
                                    <thead>
                                      <tr>
                                        <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700">
                                          반
                                        </th>
                                        {GRADES.map((grade) => (
                                          <th
                                            key={grade}
                                            className="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-semibold text-gray-700 min-w-[100px]"
                                          >
                                            <label className="flex items-center justify-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isGradeAllSelected(grade)}
                                                onChange={() => handleGradeToggle(grade)}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                              />
                                              <span className="ml-2">{grade}학년</span>
                                            </label>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {CLASS_NUMBERS.map((classNumber) => (
                                        <tr key={classNumber}>
                                          <td className="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-medium text-gray-700">
                                            {classNumber}반
                                          </td>
                                          {GRADES.map((grade) => {
                                            const selected = isClassSelected(grade, classNumber);
                                            return (
                                              <td
                                                key={`${grade}-${classNumber}`}
                                                className={cn(
                                                  "border border-gray-300 px-3 py-2 text-center",
                                                  selected ? "bg-blue-50" : "bg-white"
                                                )}
                                              >
                                                <label className="flex items-center justify-center cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => handleClassToggle(grade, classNumber)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                                  />
                                                </label>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 학부모 학급 선택 UI */}
                          {option.value === "parents" && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700">대상 학급 선택 (자녀 학년/반)</h4>
                                  <p className="text-xs text-gray-500 mt-1">자녀가 다니는 학년과 반을 선택하세요</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleParentClearAll}
                                  className="text-xs h-7 px-2"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  모두 지움
                                </Button>
                              </div>
                              
                              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-sm">
                                    <thead>
                                      <tr>
                                        <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700">
                                          반
                                        </th>
                                        {GRADES.map((grade) => (
                                          <th
                                            key={grade}
                                            className="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-semibold text-gray-700 min-w-[100px]"
                                          >
                                            <label className="flex items-center justify-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isParentGradeAllSelected(grade)}
                                                onChange={() => handleParentGradeToggle(grade)}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                              />
                                              <span className="ml-2">{grade}학년</span>
                                            </label>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {CLASS_NUMBERS.map((classNumber) => (
                                        <tr key={classNumber}>
                                          <td className="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-medium text-gray-700">
                                            {classNumber}반
                                          </td>
                                          {GRADES.map((grade) => {
                                            const selected = isParentClassSelected(grade, classNumber);
                                            return (
                                              <td
                                                key={`parent-${grade}-${classNumber}`}
                                                className={cn(
                                                  "border border-gray-300 px-3 py-2 text-center",
                                                  selected ? "bg-green-50" : "bg-white"
                                                )}
                                              >
                                                <label className="flex items-center justify-center cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => handleParentClassToggle(grade, classNumber)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                                  />
                                                </label>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 모달 푸터 */}
                  <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTargetModalOpen(false)}
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        setIsTargetModalOpen(false);
                      }}
                    >
                      선택 완료
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">예약 발행</p>
                <p className="text-xs text-gray-500">필요 시 자동 게시 시간 지정</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={useSchedule}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setUseSchedule(checked);
                    // 예약 발행을 체크하면 기본값 설정, 해제하면 빈 문자열
                    if (checked && !publishAt) {
                      setPublishAt(getDefaultPublishAt());
                    } else if (!checked) {
                      setPublishAt("");
                    }
                  }}
                />
                사용
              </label>
            </div>
            {useSchedule && (
              <Input
                type="datetime-local"
                label="시작 시각"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-3"
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          {toolbarItems?.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              aria-label={item.label}
              className={cn(
                "rounded-md p-2 text-sm text-gray-600 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                item.active && "bg-white text-blue-600 shadow-sm"
              )}
            >
              {item.icon}
            </button>
          ))}
        </div>

        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={isDisabled} isLoading={isSubmitting}>
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting 
            ? (editId ? "수정 중..." : "저장 중...") 
            : (editId ? "수정하기" : "저장하기")}
        </Button>
      </div>
    </form>
  );
}

