"use client";

import { FormEvent, useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import UnderlineExtension from "@tiptap/extension-underline";
import TiptapImage from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Undo, Redo, Send, ChevronDown, X, Check, Plus, Trash2, Type, Image as ImageIcon, Palette, Eraser } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// 폰트 크기 커스텀 Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => {
              const fontSize = element.style.fontSize;
              return fontSize ? fontSize.replace('px', '') : null;
            },
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return { style: `font-size: ${attributes.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize: size })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .unsetMark('textStyle')
          .run();
      },
    } as any;
  },
});

// 텍스트 색상 커스텀 Extension
const TextColor = Extension.create({
  name: 'textColor',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: element => element.style.color || null,
            renderHTML: attributes => {
              if (!attributes.color) {
                return {};
              }
              return { style: `color: ${attributes.color}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setColor: (color: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { color })
          .run();
      },
      unsetColor: () => ({ chain }: any) => {
        return chain()
          .unsetMark('textStyle')
          .run();
      },
    } as any;
  },
});

const targetOptions = [
  { value: "students", label: "모든 재학생" },
  { value: "parents", label: "모든 학부모" },
  { value: "teacher", label: "전 교직원" },
];

const fontSizeOptions = [
  { value: "", label: "기본 크기" },
  { value: "12", label: "12px" },
  { value: "14", label: "14px" },
  { value: "16", label: "16px" },
  { value: "18", label: "18px" },
  { value: "20", label: "20px" },
  { value: "24", label: "24px" },
  { value: "28", label: "28px" },
  { value: "32", label: "32px" },
  { value: "36", label: "36px" },
  { value: "48", label: "48px" },
];

// 색상 옵션: 3행 5열 (15개 색상)
const colorOptions = [
  // 첫 번째 행: 그레이스케일
  { value: "#000000", label: "검정", color: "#000000" },
  { value: "#4A4A4A", label: "진한 회색", color: "#4A4A4A" },
  { value: "#808080", label: "중간 회색", color: "#808080" },
  { value: "#C0C0C0", label: "밝은 회색", color: "#C0C0C0" },
  { value: "#FFFFFF", label: "흰색", color: "#FFFFFF" },
  // 두 번째 행: 따뜻한 색상
  { value: "#FF6B6B", label: "빨간-주황", color: "#FF6B6B" },
  { value: "#FFA500", label: "주황", color: "#FFA500" },
  { value: "#FFD700", label: "노랑", color: "#FFD700" },
  { value: "#90EE90", label: "라임 그린", color: "#90EE90" },
  { value: "#32CD32", label: "초록", color: "#32CD32" },
  // 세 번째 행: 차가운 색상
  { value: "#40E0D0", label: "청록", color: "#40E0D0" },
  { value: "#87CEEB", label: "하늘색", color: "#87CEEB" },
  { value: "#4169E1", label: "파랑", color: "#4169E1" },
  { value: "#9370DB", label: "보라-파랑", color: "#9370DB" },
  { value: "#DDA0DD", label: "연한 보라", color: "#DDA0DD" },
];

const categoryOptions = [
  { value: "notice", label: "단순 알림" },
  { value: "survey", label: "설문 조사" },
  { value: "consent", label: "동의서" },
];

// 선택된 대상들을 audience 값으로 변환 (기본값 계산)
const convertTargetsToAudience = (selectedTargets: string[]): string => {
  if (selectedTargets.length === 0) return "";
  if (selectedTargets.length === 1) {
    if (selectedTargets[0] === "students") return "all";
    if (selectedTargets[0] === "teacher") return "teacher";
    return selectedTargets[0];
  }
  // 여러 개 선택된 경우 첫 번째 값을 사용 (하위 호환성)
  if (selectedTargets[0] === "students") return "all";
  if (selectedTargets[0] === "teacher") return "teacher";
  return selectedTargets[0];
};

// selectedClasses와 parentSelectedClasses를 기반으로 정확한 audience 값 계산
const calculateAudienceFromClasses = (
  selectedTargets: string[],
  selectedClasses: SelectedClass[],
  parentSelectedClasses: SelectedClass[]
): string => {
  const hasStudents = selectedTargets.includes("students");
  const hasParents = selectedTargets.includes("parents");
  const hasTeacher = selectedTargets.includes("teacher");

  // 교직원만 선택된 경우
  if (!hasStudents && !hasParents && hasTeacher) {
    return "teacher";
  }

  // 학부모만 선택된 경우
  if (!hasStudents && hasParents && !hasTeacher) {
    return "parents";
  }

  // 재학생이 선택된 경우
  if (hasStudents && selectedClasses.length > 0) {
    const TOTAL_CLASSES = 21; // 3학년 * 7반
    const CLASSES_PER_GRADE = 7; // 학년당 7반

    // 모든 학반이 선택된 경우
    if (selectedClasses.length === TOTAL_CLASSES) {
      return "all";
    }

    // 학년별로 그룹화
    const grades = Array.from(new Set(selectedClasses.map(c => c.grade))).sort();
    
    // 하나의 학년만 선택된 경우
    if (grades.length === 1) {
      const grade = grades[0];
      const gradeClasses = selectedClasses.filter(c => c.grade === grade);
      // 해당 학년의 모든 반이 선택된 경우
      if (gradeClasses.length === CLASSES_PER_GRADE) {
        return `grade-${grade}`;
      }
    }

    // 여러 학년이 선택되거나 일부 반만 선택된 경우
    // 첫 번째 학년을 기준으로 설정 (기존 로직 유지)
    const firstGrade = selectedClasses[0].grade;
    return `grade-${firstGrade}`;
  }

  // 재학생이 선택되었지만 학급이 선택되지 않은 경우 (기본값)
  if (hasStudents) {
    return "all";
  }

  // 기본값 반환 (이 경우는 발생하지 않아야 함)
  return convertTargetsToAudience(selectedTargets);
};

// audience 값을 선택된 대상들로 변환
const convertAudienceToTargets = (audience: string): string[] => {
  if (!audience) return [];
  if (audience === "all" || audience.startsWith("grade-")) {
    return ["students"];
  }
  if (audience === "students") {
    return ["students"];
  }
  if (audience === "parents" || audience === "teacher") {
    return [audience];
  }
  return [];
};

interface SelectedClass {
  grade: string;
  classNumber: string;
}

interface SurveyQuestion {
  id: string;
  type: "single" | "multiple" | "text" | "textarea";
  question: string;
  options?: string[];
  required: boolean;
}

const GRADES = ["1", "2", "3"];
const CLASS_NUMBERS = Array.from({ length: 7 }, (_, i) => 
  String(i + 1).padStart(2, "0")
);

const getAllClasses = (): SelectedClass[] => {
  const allClasses: SelectedClass[] = [];
  GRADES.forEach((grade) => {
    CLASS_NUMBERS.forEach((classNumber) => {
      allClasses.push({ grade, classNumber });
    });
  });
  return allClasses;
};

const getDefaultPublishAt = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 30, 0, 0);
  
  // 로컬 시간으로 변환 (datetime-local은 로컬 시간을 사용)
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const hours = String(tomorrow.getHours()).padStart(2, '0');
  const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface ConsentData {
  signatureImage?: string; // Base64 이미지 (선택사항)
  signedAt?: string; // 서명 일시 (선택사항)
  requiresSignature?: boolean; // 서명이 필요한지 여부 (설문 조사에서 서명 포함 체크 시)
}

interface AnnouncementComposerPayload {
  title: string;
  category?: string;
  courseId?: string;
  boardType?: string;
  audience: string;
  author: string;
  content: string;
  isScheduled: boolean;
  publishAt?: string;
  selectedClasses?: SelectedClass[];
  parentSelectedClasses?: SelectedClass[];
  selectedTeacherIds?: string[];
  surveyData?: SurveyQuestion[];
  surveyStartDate?: string;
  surveyEndDate?: string;
  consentData?: ConsentData;
  editableBy?: string[];
}

interface AnnouncementComposerProps {
  authorName: string;
  courseId?: string;
  boardType?: string;
  onPreview?: (payload: AnnouncementComposerPayload) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showButton?: boolean;
  editId?: string; // 수정 모드일 때 안내문 ID
  onEditComplete?: () => void; // 수정 완료 후 콜백
  restrictedAudience?: string; // 제한된 알림 대상 (예: "teacher", "students")
}

export function AnnouncementComposer({ authorName, courseId, boardType, onPreview, isOpen: controlledIsOpen, onOpenChange, showButton = true, editId, onEditComplete, restrictedAudience }: AnnouncementComposerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 외부에서 제어하는 경우와 내부에서 제어하는 경우 모두 지원
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
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

  const modalContent = (
    <AnnouncementComposerForm authorName={authorName} courseId={courseId} boardType={boardType} onPreview={onPreview} onClose={handleClose} editId={editId} onEditComplete={onEditComplete} restrictedAudience={restrictedAudience} />
  );

  return (
    <>
      {mounted && typeof window !== "undefined" && createPortal(
        modalContent,
        document.body
      )}
    </>
  );
}

function AnnouncementComposerForm({
  authorName,
  courseId,
  boardType,
  onPreview,
  onClose,
  editId,
  onEditComplete,
  restrictedAudience,
}: AnnouncementComposerProps & { onClose: () => void; editId?: string; onEditComplete?: () => void; restrictedAudience?: string }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("notice");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
  const [parentSelectedClasses, setParentSelectedClasses] = useState<SelectedClass[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [surveyStartDate, setSurveyStartDate] = useState("");
  const [surveyEndDate, setSurveyEndDate] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePanel, setShowSignaturePanel] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [useSchedule, setUseSchedule] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!editId);
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{
    filePath: string;
    originalFileName: string;
    fileSize: number | null;
    mimeType: string | null;
  }[]>([]);
  const [editableBy, setEditableBy] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<{id: string, name: string, email: string}[]>([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherOptions, setTeacherOptions] = useState<{id: string, name: string, email: string}[]>([]);
  const [isTeacherSearchOpen, setIsTeacherSearchOpen] = useState(false);
  const [teacherList, setTeacherList] = useState<{id: string, name: string, email: string, roleLabel: string | null}[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [targetTeacherSearchQuery, setTargetTeacherSearchQuery] = useState("");
  const [selectedRoleLabelFilter, setSelectedRoleLabelFilter] = useState<string>("");
  const [editorUpdateKey, setEditorUpdateKey] = useState(0);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const teacherSearchRef = useRef<HTMLDivElement>(null);
  const targetModalRef = useRef<HTMLDivElement>(null);
  const classSelectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const isCourseAudienceLocked = Boolean(courseId);

  const editor = useEditor({
    onUpdate: () => {
      setEditorUpdateKey(prev => prev + 1);
    },
    onSelectionUpdate: () => {
      setEditorUpdateKey(prev => prev + 1);
    },
    onTransaction: () => {
      setEditorUpdateKey(prev => prev + 1);
    },
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          keepMarks: true,
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
      }),
      Placeholder.configure({
        placeholder: "공지 내용을 입력하세요...",
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      TextStyle,
      FontSize,
      TextColor,
      UnderlineExtension,
      TiptapImage.configure({
        inline: true,
        allowBase64: false, // Base64 비활성화 (URL만 허용)
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500",
      },
      // 링크 클릭 처리: Ctrl/Cmd 키를 누른 상태에서만 링크로 이동 (새 창에서 열기)
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        // 링크 요소인지 확인
        if (target.tagName === 'A' || target.closest('a')) {
          const linkElement = target.tagName === 'A' ? target : target.closest('a') as HTMLAnchorElement;
          // Ctrl (Windows/Linux) 또는 Cmd (Mac) 키가 눌려있지 않으면 기본 동작 방지
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            return true; // 이벤트 처리됨
          }
          // Ctrl/Cmd 키가 눌려있을 때 새 창에서 열기
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const href = linkElement.getAttribute('href');
            if (href) {
              // 새 창으로 열기 (창 크기와 위치 지정)
              const width = 1200;
              const height = 800;
              const left = (window.screen.width - width) / 2;
              const top = (window.screen.height - height) / 2;
              window.open(
                href,
                '_blank',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes,noopener,noreferrer`
              );
            }
            return true; // 이벤트 처리됨
          }
        }
        return false; // 다른 경우는 기본 동작 허용
      },
      // 클립보드에서 이미지 붙여넣기 처리
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            
            // 파일 크기 제한 (5MB)
            if (file.size > 5 * 1024 * 1024) {
              setTimeout(() => setError("이미지 크기는 5MB 이하여야 합니다."), 0);
              return false;
            }
            
            // Blob Storage에 업로드 (비동기 처리)
            const formData = new FormData();
            formData.append('file', file);
            
            fetch('/api/announcements/images', {
              method: 'POST',
              body: formData,
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Upload failed');
                }
                return response.json();
              })
              .then(data => {
                // 업로드된 URL로 이미지 삽입
                const { state, dispatch } = view;
                const { schema } = state;
                const imageNode = schema.nodes.image.create({ src: data.url });
                const transaction = state.tr.replaceSelectionWith(imageNode);
                dispatch(transaction);
              })
              .catch(error => {
                console.error('Image upload error:', error);
                setTimeout(() => setError("이미지 업로드 중 오류가 발생했습니다."), 0);
              });
            
            return true; // 붙여넣기 처리됨을 표시
          }
        }
        return false;
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
            throw new Error(data.error || "안내문을 불러오는데 실패했습니다.");
          }

          const announcement = data.announcement;
          setTitle(announcement.title);
          setCategory(announcement.category || "notice");
          const audienceTargets = convertAudienceToTargets(announcement.audience);
          // 선택된 학급 정보 로드 (있는 경우)
          let loadedSelectedClasses: SelectedClass[] = [];
          if (announcement.selectedClasses) {
            try {
              const classes = typeof announcement.selectedClasses === 'string' 
                ? JSON.parse(announcement.selectedClasses) 
                : announcement.selectedClasses;
              loadedSelectedClasses = Array.isArray(classes) ? classes : [];
            } catch (e) {
              loadedSelectedClasses = [];
            }
          }
          setSelectedClasses(loadedSelectedClasses);
          // 학부모용 선택된 학급 정보 로드 (있는 경우)
          let loadedParentSelectedClasses: SelectedClass[] = [];
          if (announcement.parentSelectedClasses) {
            try {
              const classes = typeof announcement.parentSelectedClasses === 'string' 
                ? JSON.parse(announcement.parentSelectedClasses) 
                : announcement.parentSelectedClasses;
              loadedParentSelectedClasses = Array.isArray(classes) ? classes : [];
            } catch (e) {
              loadedParentSelectedClasses = [];
            }
          }
          setParentSelectedClasses(loadedParentSelectedClasses);
          if (loadedParentSelectedClasses.length > 0 && !audienceTargets.includes("parents")) {
            audienceTargets.push("parents");
          }
          setSelectedTargets(audienceTargets);
          setUseSchedule(announcement.isScheduled);
          setPublishAt(announcement.publishAt ? new Date(announcement.publishAt).toISOString().slice(0, 16) : "");
          editor.commands.setContent(announcement.content);
          // 설문 조사 데이터 로드 (있는 경우)
          if (announcement.surveyData) {
            try {
              const surveyData = typeof announcement.surveyData === 'string' 
                ? JSON.parse(announcement.surveyData) 
                : announcement.surveyData;
              setSurveyQuestions(Array.isArray(surveyData) ? surveyData : []);
            } catch (e) {
              setSurveyQuestions([]);
            }
          } else {
            setSurveyQuestions([]);
          }
          // 설문 조사 기간 로드 (있는 경우)
          if (announcement.surveyStartDate) {
            setSurveyStartDate(new Date(announcement.surveyStartDate).toISOString().slice(0, 16));
          } else {
            setSurveyStartDate("");
          }
          if (announcement.surveyEndDate) {
            setSurveyEndDate(new Date(announcement.surveyEndDate).toISOString().slice(0, 16));
          } else {
            setSurveyEndDate("");
          }
          // 동의서 서명 데이터 로드 (있는 경우)
          if (announcement.consentData) {
            try {
              const consentData = typeof announcement.consentData === 'string' 
                ? JSON.parse(announcement.consentData) 
                : announcement.consentData;
              
              if (consentData?.signatureImage) {
                setSignatureData(consentData.signatureImage);
              } else {
                setSignatureData(null);
              }
              
              // 설문 조사일 때 requiresSignature가 true이거나 signatureImage가 있으면 서명 패널 표시
              if (announcement.category === "survey") {
                if (consentData?.requiresSignature || consentData?.signatureImage) {
                  setShowSignaturePanel(true);
                } else {
                  setShowSignaturePanel(false);
                }
              } else if (announcement.category === "consent") {
                // 동의서는 항상 서명 패널 표시
                if (consentData?.signatureImage) {
                  setShowSignaturePanel(true);
                }
              }
            } catch (e) {
              setSignatureData(null);
              if (announcement.category === "survey") {
                setShowSignaturePanel(false);
              }
            }
          } else {
            setSignatureData(null);
            if (announcement.category !== "consent") {
              setShowSignaturePanel(false);
            }
          }
          // 첨부 파일 데이터 로드 (있는 경우)
          if (announcement.attachments) {
            try {
              const attachments = typeof announcement.attachments === 'string'
                ? JSON.parse(announcement.attachments)
                : announcement.attachments;
              setExistingAttachments(Array.isArray(attachments) ? attachments : []);
            } catch (e) {
              setExistingAttachments([]);
            }
          } else {
            setExistingAttachments([]);
          }
          // 선택된 교직원 ID 로드 (있는 경우)
          if (announcement.selectedTeacherIds && Array.isArray(announcement.selectedTeacherIds) && announcement.selectedTeacherIds.length > 0) {
            setSelectedTeacherIds(announcement.selectedTeacherIds);
          } else if (announcement.audience && announcement.audience.startsWith('teacher:')) {
            // audience에서 교직원 ID 추출 (형식: teacher:id1,id2,...)
            const teacherIds = announcement.audience.replace('teacher:', '').split(',').filter((id: string) => id.trim());
            setSelectedTeacherIds(teacherIds);
          } else {
            setSelectedTeacherIds([]);
          }
          
          // 수정 권한 데이터 로드 (있는 경우)
          if (announcement.editableBy && Array.isArray(announcement.editableBy) && announcement.editableBy.length > 0) {
            try {
              const editableByData = announcement.editableBy;
              setEditableBy(editableByData);
              // 교사 정보 로드
              const teacherIds = editableByData.join(',');
              const teachersResponse = await fetch(`/api/teachers?ids=${encodeURIComponent(teacherIds)}`);
              if (teachersResponse.ok) {
                const teachersData = await teachersResponse.json();
                setSelectedTeachers(teachersData.teachers || []);
              }
            } catch (e) {
              setEditableBy([]);
              setSelectedTeachers([]);
            }
          } else {
            setEditableBy([]);
            setSelectedTeachers([]);
          }
        } catch (err: any) {
          console.error("Failed to load announcement:", err);
          setError(err.message || "안내문을 불러오는 중 오류가 발생했습니다.");
        } finally {
          setIsLoading(false);
        }
      };

      loadAnnouncement();
    }
  }, [editId, editor]);

  // restrictedAudience에 따라 필터링된 targetOptions 생성
  const availableTargetOptions = restrictedAudience === "teacher" 
    ? targetOptions.filter(opt => opt.value === "teacher")
    : restrictedAudience === "students"
    ? targetOptions.filter(opt => opt.value === "students")
    : targetOptions.filter(opt => opt.value !== "teacher"); // 일반 안내문에서는 "전 교직원" 제외

  // category 변경 시 showSignaturePanel 초기화 (동의서가 아닌 경우)
  useEffect(() => {
    if (category !== "consent" && category !== "survey") {
      setShowSignaturePanel(false);
    } else if (category === "consent") {
      setShowSignaturePanel(true);
    }
  }, [category]);

  // restrictedAudience가 "teacher"일 때 초기값 설정
  useEffect(() => {
    if (restrictedAudience === "teacher" && selectedTargets.length === 0 && !editId) {
      setSelectedTargets(["teacher"]);
    }
  }, [restrictedAudience, editId]);

  // restrictedAudience가 "students"일 때 초기값 설정
  useEffect(() => {
    if (restrictedAudience === "students" && !editId) {
      if (selectedTargets.length === 0) {
        setSelectedTargets(["students"]);
      }
      setSelectedClasses(getAllClasses());
    }
  }, [restrictedAudience, editId]);

  // courseId가 있는 경우 수강생 전체로 고정
  useEffect(() => {
    if (isCourseAudienceLocked) {
      setSelectedTargets(["students"]);
      setSelectedClasses([]);
      setParentSelectedClasses([]);
      setSelectedTeacherIds([]);
      setIsTargetModalOpen(false);
      setCategory("notice");
    }
  }, [isCourseAudienceLocked]);

  // 교직원 목록 가져오기 (모달이 열릴 때)
  useEffect(() => {
    if (isTargetModalOpen && restrictedAudience === "teacher" && teacherList.length === 0) {
      const fetchTeachers = async () => {
        setIsLoadingTeachers(true);
        try {
          const response = await fetch('/api/teachers');
          if (response.ok) {
            const data = await response.json();
            const teachers = data.teachers || [];
            setTeacherList(teachers);
            // 초기값: selectedTeacherIds가 비어있으면 모든 교직원 선택
            if (selectedTeacherIds.length === 0 && teachers.length > 0 && !editId) {
              setSelectedTeacherIds(teachers.map((t: {id: string}) => t.id));
            }
          }
        } catch (error) {
          console.error("Failed to fetch teachers:", error);
        } finally {
          setIsLoadingTeachers(false);
        }
      };
      fetchTeachers();
    }
  }, [isTargetModalOpen, restrictedAudience, editId]);

  // 교사 검색
  useEffect(() => {
    if (!isTeacherSearchOpen || !teacherSearchQuery.trim()) {
      setTeacherOptions([]);
      return;
    }

    const searchTeachers = async () => {
      try {
        const response = await fetch(`/api/teachers?search=${encodeURIComponent(teacherSearchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setTeacherOptions(data.teachers || []);
        }
      } catch (error) {
        console.error("Failed to search teachers:", error);
      }
    };

    const timeoutId = setTimeout(searchTeachers, 300);
    return () => clearTimeout(timeoutId);
  }, [teacherSearchQuery, isTeacherSearchOpen]);

  // 교사 검색 모달 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teacherSearchRef.current && !teacherSearchRef.current.contains(event.target as Node)) {
        setIsTeacherSearchOpen(false);
      }
    };

    if (isTeacherSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTeacherSearchOpen]);

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length > 0) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const tooLarge = selectedFiles.find((f) => f.size > maxSize);
      if (tooLarge) {
        setError("파일 크기는 50MB 이하여야 합니다.");
        return;
      }
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  // 개별 파일 삭제 핸들러
  const handleRemoveSelectedFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ESC 키로 모달 닫기 및 body 스크롤 방지
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isTargetModalOpen) {
        setIsTargetModalOpen(false);
        } else {
          onClose();
        }
      }
    };

    // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      // 모달이 닫힐 때 body 스크롤 복원
      if (!isTargetModalOpen) {
      document.body.style.overflow = "unset";
      }
    };
  }, [isTargetModalOpen, onClose]);

  // 에디터 내 링크의 커서 스타일 및 툴팁 동적 적용 (Ctrl/Cmd 키 상태에 따라 변경)
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom as HTMLElement;
    
    // 툴팁 요소 생성
    const createTooltip = (): HTMLElement => {
      const tooltip = document.createElement('div');
      tooltip.id = 'link-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background-color: #1f2937;
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        opacity: 0;
        transition: opacity 0.2s;
      `;
      document.body.appendChild(tooltip);
      return tooltip;
    };

    let tooltip: HTMLElement | null = null;
    let currentLink: HTMLAnchorElement | null = null;
    
    // 툴팁 표시
    const showTooltip = (link: HTMLAnchorElement, event: MouseEvent, isCtrlPressed: boolean) => {
      if (!tooltip) {
        tooltip = createTooltip();
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const keyText = isMac ? 'Cmd' : 'Ctrl';
      tooltip.textContent = isCtrlPressed 
        ? `${keyText}+클릭하여 링크로 이동` 
        : `${keyText} 키를 누르고 클릭하여 링크로 이동`;
      
      // 툴팁을 먼저 표시하여 크기 계산 가능하도록 함
      tooltip.style.opacity = '1';
      tooltip.style.visibility = 'hidden';
      tooltip.style.display = 'block';
      
      // 툴팁 위치 설정 (링크 위쪽 중앙)
      const rect = link.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      const top = rect.top - tooltipRect.height - 8;
      
      // 화면 경계 체크 및 조정
      const adjustedLeft = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      const adjustedTop = top < 8 ? rect.bottom + 8 : top;
      
      tooltip.style.left = `${adjustedLeft}px`;
      tooltip.style.top = `${adjustedTop}px`;
      tooltip.style.visibility = 'visible';
    };

    // 툴팁 숨기기
    const hideTooltip = () => {
      if (tooltip) {
        tooltip.style.opacity = '0';
        currentLink = null;
      }
    };

    // 툴팁 제거
    const removeTooltip = () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    };
    
    // 에디터 내 모든 링크에 기본적으로 text 커서 적용
    const updateLinkCursors = () => {
      const links = editorElement.querySelectorAll('a');
      links.forEach(link => {
        (link as HTMLElement).style.cursor = 'text';
      });
    };

    // Ctrl/Cmd 키 상태 추적
    let isCtrlPressed = false;

    // 키 눌림 감지
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        isCtrlPressed = true;
        // 링크 위에 마우스가 있는 경우 커서 및 툴팁 업데이트
        if (currentLink) {
          currentLink.style.cursor = 'pointer';
          const mouseEvent = new MouseEvent('mousemove', { bubbles: true });
          showTooltip(currentLink, mouseEvent, true);
        }
      }
    };

    // 키 떼어짐 감지
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        isCtrlPressed = false;
        // 모든 링크의 커서를 text로 복원
        updateLinkCursors();
        // 툴팁 업데이트
        if (currentLink) {
          const mouseEvent = new MouseEvent('mousemove', { bubbles: true });
          showTooltip(currentLink, mouseEvent, false);
        }
      }
    };

    // 링크에 마우스를 올렸을 때
    const handleLinkMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        const linkElement = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement;
        currentLink = linkElement;
        // Ctrl/Cmd 키가 눌려있으면 pointer, 아니면 text
        if (isCtrlPressed || event.ctrlKey || event.metaKey) {
          linkElement.style.cursor = 'pointer';
        } else {
          linkElement.style.cursor = 'text';
        }
        // 툴팁 표시
        showTooltip(linkElement, event, isCtrlPressed || event.ctrlKey || event.metaKey);
      }
    };

    // 링크에서 마우스가 벗어났을 때
    const handleLinkMouseLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        const linkElement = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement;
        // Ctrl/Cmd 키가 눌려있지 않으면 text로 복원
        if (!isCtrlPressed) {
          linkElement.style.cursor = 'text';
        }
        // 툴팁 숨기기
        hideTooltip();
        currentLink = null;
      }
    };

    // 링크 위에서 마우스 이동 시 (키 상태 변경 감지)
    const handleLinkMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        const linkElement = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement;
        currentLink = linkElement;
        const ctrlState = event.ctrlKey || event.metaKey || isCtrlPressed;
        if (ctrlState) {
          linkElement.style.cursor = 'pointer';
        } else {
          linkElement.style.cursor = 'text';
        }
        // 툴팁 업데이트
        showTooltip(linkElement, event, ctrlState);
      }
    };

    // 전역 키 이벤트 리스너 추가
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // 에디터 내 링크 이벤트 리스너 추가
    editorElement.addEventListener('mouseenter', handleLinkMouseEnter, true);
    editorElement.addEventListener('mouseleave', handleLinkMouseLeave, true);
    editorElement.addEventListener('mousemove', handleLinkMouseMove, true);
    
    // 초기 커서 설정
    updateLinkCursors();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      editorElement.removeEventListener('mouseenter', handleLinkMouseEnter, true);
      editorElement.removeEventListener('mouseleave', handleLinkMouseLeave, true);
      editorElement.removeEventListener('mousemove', handleLinkMouseMove, true);
      removeTooltip();
    };
  }, [editor, editorUpdateKey]);

  // 색상 선택 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };

    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen]);

  // 알림 대상 모달 열기/닫기 핸들러
  const handleTargetModalToggle = () => {
    if (isCourseAudienceLocked) {
      return;
    }
    setIsTargetModalOpen(prev => !prev);
  };

  // 교사 선택 핸들러
  const handleTeacherSelect = (teacher: {id: string, name: string, email: string}) => {
    if (!editableBy.includes(teacher.id)) {
      setEditableBy([...editableBy, teacher.id]);
      setSelectedTeachers([...selectedTeachers, teacher]);
    }
    setTeacherSearchQuery("");
    setIsTeacherSearchOpen(false);
  };

  // 교사 제거 핸들러
  const handleTeacherRemove = (teacherId: string) => {
    setEditableBy(editableBy.filter(id => id !== teacherId));
    setSelectedTeachers(selectedTeachers.filter(t => t.id !== teacherId));
  };

  // 제목이 비어있거나 알림 대상이 없거나 제출 중일 때 비활성화
  const hasTitle = title.trim().length > 0;
  const hasTargets = restrictedAudience === "teacher" 
    ? selectedTeacherIds.length > 0 || selectedTargets.length > 0
    : selectedTargets.length > 0;
  const isDisabled = !hasTitle || !hasTargets || isSubmitting;

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

  // 교직원 선택/해제 핸들러 (알림 대상용)
  const handleTargetTeacherSelect = (teacherId: string) => {
    if (selectedTeacherIds.includes(teacherId)) {
      setSelectedTeacherIds(selectedTeacherIds.filter(id => id !== teacherId));
    } else {
      setSelectedTeacherIds([...selectedTeacherIds, teacherId]);
    }
  };

  // 전 교직원 선택 여부 확인
  const isAllTeachersSelected = () => {
    if (teacherList.length === 0) return false;
    // 모든 교직원이 선택된 경우
    return selectedTeacherIds.length === teacherList.length && teacherList.length > 0;
  };

  // 고유한 roleLabel 목록 추출
  const uniqueRoleLabels = useMemo(() => {
    const roleLabels = new Set<string>();
    teacherList.forEach((teacher) => {
      const roleLabel = teacher.roleLabel?.trim();
      if (roleLabel && roleLabel !== "-" && roleLabel !== "") {
        roleLabels.add(roleLabel);
      }
    });
    return Array.from(roleLabels).sort();
  }, [teacherList]);

  // 필터링된 교직원 목록 (검색어 및 roleLabel 필터 적용)
  const filteredTeachers = useMemo(() => {
    let result = [...teacherList];

    // roleLabel 필터 적용
    if (selectedRoleLabelFilter) {
      result = result.filter((teacher) => {
        const teacherRoleLabel = teacher.roleLabel?.trim() || "";
        return teacherRoleLabel === selectedRoleLabelFilter;
      });
    }

    // 검색 필터 적용 (콤마로 구분된 다중 검색어 지원)
    if (targetTeacherSearchQuery.trim()) {
      // 콤마로 구분하여 검색어 배열 생성
      const searchTerms = targetTeacherSearchQuery
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0); // 빈 검색어 제거

      if (searchTerms.length > 0) {
        result = result.filter((teacher) => {
          const teacherName = teacher.name?.toLowerCase() || '';
          const teacherEmail = teacher.email.toLowerCase();
          const teacherRoleLabel = teacher.roleLabel?.toLowerCase() || '';
          
          // 여러 검색어 중 하나라도 포함되면 표시 (OR 검색)
          return searchTerms.some(term => 
            teacherName.includes(term) || 
            teacherEmail.includes(term) ||
            teacherRoleLabel.includes(term)
          );
        });
      }
    }

    // 이름 순서로 정렬
    result = [...result].sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "");
    });

    return result;
  }, [teacherList, targetTeacherSearchQuery, selectedRoleLabelFilter]);

  // 필터링된 교직원 중 선택된 수
  const selectedFilteredCount = useMemo(() => {
    return filteredTeachers.filter(t => selectedTeacherIds.includes(t.id)).length;
  }, [filteredTeachers, selectedTeacherIds]);

  // 필터링된 교직원 전체 선택 여부
  const allFilteredSelected = useMemo(() => {
    return filteredTeachers.length > 0 && 
           filteredTeachers.every(t => selectedTeacherIds.includes(t.id));
  }, [filteredTeachers, selectedTeacherIds]);

  // 필터링된 교직원 전체 선택/해제
  const selectAllFiltered = () => {
    const filteredIds = filteredTeachers.map(t => t.id);
    const newSelectedIds = new Set(selectedTeacherIds);
    filteredIds.forEach(id => newSelectedIds.add(id));
    setSelectedTeacherIds(Array.from(newSelectedIds));
  };

  const deselectAllFiltered = () => {
    const filteredIds = new Set(filteredTeachers.map(t => t.id));
    setSelectedTeacherIds(selectedTeacherIds.filter(id => !filteredIds.has(id)));
  };

  // 전체 선택/해제 (전 교직원)
  const handleSelectAllTeachers = () => {
    if (isAllTeachersSelected()) {
      // 모두 선택된 경우 -> 모두 해제
      setSelectedTeacherIds([]);
    } else {
      // 일부만 선택되었거나 선택되지 않은 경우 -> 모두 선택
      setSelectedTeacherIds(teacherList.map(t => t.id));
    }
  };

  // 선택된 대상 표시 텍스트
  const getTargetDisplayText = () => {
    if (isCourseAudienceLocked) {
      return "수강생 전체";
    }
    if (selectedTargets.length === 0) {
      return "알림 대상을 선택하세요";
    }
    
    // restrictedAudience가 "teacher"인 경우
    if (restrictedAudience === "teacher") {
      if (selectedTeacherIds.length === 0) {
        return "전 교직원";
      } else if (selectedTeacherIds.length === teacherList.length) {
        return "전 교직원";
      } else {
        return `교직원 ${selectedTeacherIds.length}명`;
      }
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

    // selectedClasses와 parentSelectedClasses를 기반으로 정확한 audience 값 계산
    const audience = restrictedAudience === "teacher"
      ? (selectedTeacherIds.length > 0 
          ? `teacher:${selectedTeacherIds.join(',')}` 
          : "teacher") // 선택된 교직원이 없으면 전체 교직원
      : restrictedAudience === "students"
      ? "students"
      : calculateAudienceFromClasses(
          selectedTargets,
          selectedTargets.includes("students") ? selectedClasses : [],
          selectedTargets.includes("parents") ? parentSelectedClasses : []
        );

    const payload: AnnouncementComposerPayload = {
      title: title.trim(),
      category: category || undefined,
      courseId: courseId || undefined,
      boardType: boardType || undefined,
      audience,
      author: authorName.trim(),
      content,
      isScheduled: useSchedule,
      publishAt: useSchedule && publishAt.trim() ? publishAt : undefined,
      selectedClasses: selectedTargets.includes("students") ? selectedClasses : [],
      parentSelectedClasses: selectedTargets.includes("parents") ? parentSelectedClasses : [],
      selectedTeacherIds: restrictedAudience === "teacher" ? selectedTeacherIds : undefined,
      surveyData: category === "survey" && surveyQuestions.length > 0 ? surveyQuestions : undefined,
      surveyStartDate: category === "survey" && surveyStartDate ? surveyStartDate : undefined,
      surveyEndDate: category === "survey" && surveyEndDate ? surveyEndDate : undefined,
      consentData: (() => {
        if (category === "consent" && signatureData) {
          return {
            signatureImage: signatureData,
            signedAt: new Date().toISOString(),
          };
        }
        if (category === "survey" && showSignaturePanel) {
          // 서명 포함이 체크되어 있으면, 서명이 없어도 requiresSignature 플래그 저장
          if (signatureData) {
            return {
              signatureImage: signatureData,
              signedAt: new Date().toISOString(),
              requiresSignature: true,
            };
          } else {
            // 서명이 없어도 requiresSignature 플래그만 저장
            return {
              requiresSignature: true,
            };
          }
        }
        return undefined;
      })(),
      editableBy: editableBy.length > 0 ? editableBy : undefined,
    };

    try {
      // publishAt과 설문 조사 기간을 ISO 형식으로 변환 (datetime-local 형식에서)
      const requestBody = {
        ...payload,
        publishAt: payload.publishAt && payload.publishAt.trim()
          ? new Date(payload.publishAt).toISOString()
          : undefined,
        surveyStartDate: payload.surveyStartDate && payload.surveyStartDate.trim()
          ? new Date(payload.surveyStartDate).toISOString()
          : undefined,
        surveyEndDate: payload.surveyEndDate && payload.surveyEndDate.trim()
          ? new Date(payload.surveyEndDate).toISOString()
          : undefined,
      };

      const url = editId ? `/api/announcements/${editId}` : "/api/announcements";
      const method = editId ? "PUT" : "POST";

      // 파일이 있으면 FormData 사용, 없으면 JSON 사용
      let response: Response;
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(requestBody));
        files.forEach((f) => formData.append("files", f));
        
        response = await fetch(url, {
          method,
          body: formData,
        });
      } else {
        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (editId ? "안내문 수정에 실패했습니다." : "안내문 생성에 실패했습니다."));
      }

      // 성공 시 콜백 호출
      onPreview?.(payload);
      onEditComplete?.();

      // 폼 초기화
      editor.commands.clearContent(true);
      setTitle("");
      setCategory("notice");
      setSelectedTargets([]);
      setSelectedClasses([]);
      setParentSelectedClasses([]);
      setSelectedTeacherIds([]);
      setTeacherList([]);
      setSurveyQuestions([]);
      setSurveyStartDate("");
      setSurveyEndDate("");
      setSignatureData(null);
      setShowSignaturePanel(false);
      setUseSchedule(false);
      setPublishAt("");
      setFiles([]);
      setExistingAttachments([]);
      setEditableBy([]);
      setSelectedTeachers([]);
      setIsSubmitting(false);
      clearSignature();

      // 폼 닫기
      onClose();
    } catch (err: any) {
      console.error(editId ? "Update announcement error:" : "Create announcement error:", err);
      setError(err.message || (editId ? "안내문 수정 중 오류가 발생했습니다." : "안내문 생성 중 오류가 발생했습니다."));
      setIsSubmitting(false);
    }
  };

  // 설문 조사 질문 핸들러
  const handleAddSurveyQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      type: "single",
      question: "",
      options: ["옵션 1", "옵션 2"],
      required: false,
    };
    setSurveyQuestions([...surveyQuestions, newQuestion]);
  };

  const handleUpdateSurveyQuestion = (id: string, field: keyof SurveyQuestion, value: any) => {
    setSurveyQuestions(
      surveyQuestions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q
      )
    );
  };

  const handleDeleteSurveyQuestion = (id: string) => {
    setSurveyQuestions(surveyQuestions.filter((q) => q.id !== id));
  };

  const handleAddSurveyOption = (questionId: string) => {
    setSurveyQuestions(
      surveyQuestions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...(q.options || []), `옵션 ${(q.options?.length || 0) + 1}`] }
          : q
      )
    );
  };

  const handleUpdateSurveyOption = (questionId: string, optionIndex: number, value: string) => {
    setSurveyQuestions(
      surveyQuestions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options?.map((opt, idx) =>
                idx === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const handleDeleteSurveyOption = (questionId: string, optionIndex: number) => {
    setSurveyQuestions(
      surveyQuestions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options?.filter((_, idx) => idx !== optionIndex),
            }
          : q
      )
    );
  };

  // 서명 관련 핸들러
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    // DPR이 context.scale()로 이미 적용되어 있으므로, CSS 좌표를 그대로 사용
    // scale 계산을 제거하여 이중 스케일링 방지
    
    if ('touches' in e) {
      // 터치 이벤트
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      // 마우스 이벤트
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 서명 저장
    const dataURL = canvas.toDataURL('image/png');
    setSignatureData(dataURL);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const loadSignatureToCanvas = (imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageData;
  };

  // Canvas 초기화 및 서명 로드 (category 변경 시 또는 showSignaturePanel 변경 시)
  useEffect(() => {
    if (!(category === "consent" || (category === "survey" && showSignaturePanel))) return;
    
    // 약간의 지연 후 Canvas 크기 설정 (DOM 렌더링 완료 후)
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Canvas 크기 설정 (CSS 크기에 맞춤)
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      // 기존 서명이 있으면 로드
      if (signatureData) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = signatureData;
      }
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, showSignaturePanel, signatureData]);

  const toolbarItems = useMemo(() => {
    if (!editor) return [];
    
    return [
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
        label: "밑줄",
        icon: <Underline className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleUnderline().run(),
        active: editor.isActive("underline"),
      },
      {
        label: "글씨 색상",
        icon: <Palette className="h-4 w-4" />,
        action: () => setIsColorPickerOpen(prev => !prev),
        active: !!editor.getAttributes('textStyle').color,
        isColorPicker: true,
      },
      { isDivider: true },
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
      { isDivider: true },
      {
        label: "링크",
        icon: <LinkIcon className="h-4 w-4" />,
        action: () => {
          const previousUrl = editor.getAttributes("link").href;
          const urlInput = window.prompt("링크 주소를 입력하세요.", previousUrl);
          if (urlInput === null) return;
          if (urlInput === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          // URL에 프로토콜이 없으면 https:// 추가
          let url = urlInput.trim();
          if (!url.match(/^https?:\/\//i)) {
            url = `https://${url}`;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        },
        active: editor.isActive("link"),
      },
      {
        label: "이미지",
        icon: <ImageIcon className="h-4 w-4" />,
        action: () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            // 파일 크기 제한 (5MB)
            if (file.size > 5 * 1024 * 1024) {
              setError("이미지 크기는 5MB 이하여야 합니다.");
              return;
            }
            
            // Blob Storage에 업로드
            const formData = new FormData();
            formData.append('file', file);
            
            try {
              const response = await fetch('/api/announcements/images', {
                method: 'POST',
                body: formData,
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || '이미지 업로드에 실패했습니다.');
                return;
              }
              
              const data = await response.json();
              const imageUrl = data.url;
              
              // 업로드된 URL을 에디터에 삽입
              editor.chain().focus().setImage({ src: imageUrl }).run();
            } catch (error) {
              console.error('Image upload error:', error);
              setError('이미지 업로드 중 오류가 발생했습니다.');
            }
          };
          input.click();
        },
        active: false,
      },
      { isDivider: true },
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
  }, [editor, editorUpdateKey]);

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-6xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col">
          <div className="flex items-center justify-center py-8 p-6">
          <div className="text-sm text-gray-500">안내문을 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = editId ? "안내문 수정" : "새 안내문 작성";
  const headerHeading = editId ? "안내문 수정" : "안내문 입력";
  const headerDescription = (() => {
    if (isCourseAudienceLocked) {
      return "수업 관련 공지 사항을 작성할 수 있습니다.";
    }
    if (boardType === "board_teachers") {
      return "교직원에게 필요한 공지사항을 작성하세요.";
    }
    if (boardType === "board_students") {
      return "학생 대상 공지사항을 작성하세요.";
    }
    if (boardType === "board_parents") {
      return "학부모 대상 안내문을 작성하세요.";
    }
    return "제목과 대상을 지정한 뒤 본문을 자유롭게 작성할 수 있어요.";
  })();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-6xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-6 overflow-y-auto flex-1 min-h-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            {headerTitle}
          </p>
          <h2 className="text-xl font-bold text-gray-900">{headerHeading}</h2>
        <p className="text-sm text-gray-500">
          {headerDescription}
        </p>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
        >
          <X className="h-4 w-4 mr-1.5" />
          닫기
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="w-32">
            {isCourseAudienceLocked ? (
              <Input label="구분" value="단순 알림" readOnly />
            ) : (
              <Select
                label="구분"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
                required
              />
            )}
          </div>
          <div className="flex-1">
            <Input
              label="제목"
              placeholder={isCourseAudienceLocked ? "예: 수업 관련 공지사항 안내" : "예: 11월 학부모 상담 안내"}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Input label="작성자" value={authorName} readOnly />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              알림 대상 <span className="ml-1 text-red-500">*</span>
            </label>
            {isCourseAudienceLocked ? (
              <Input value="수강생 전체" readOnly />
            ) : (
              <button
                type="button"
                onClick={handleTargetModalToggle}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left text-gray-900 placeholder:text-gray-500 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <span className={selectedTargets.length === 0 ? "text-gray-500" : "text-gray-900"}>
                {selectedTargets.length === 0 ? "알림 대상을 선택하세요" : getTargetDisplayText()}
                </span>
              </button>
            )}

            {/* 알림 대상 선택 모달 */}
            {!isCourseAudienceLocked && isTargetModalOpen && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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
                    {restrictedAudience === "teacher" ? (
                      // 교직원 게시판: 교직원 명단 표시
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-900">교직원 선택</h4>
                        </div>
                        
                        {/* 전 교직원 체크박스 */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAllTeachersSelected()}
                              onChange={handleSelectAllTeachers}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            />
                            <span className="text-base font-medium text-gray-900">전 교직원</span>
                            {isAllTeachersSelected() && teacherList.length > 0 && (
                              <span className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                                {teacherList.length}명
                              </span>
                            )}
                          </label>
                        </div>

                        {/* 검색 입력 필드 및 roleLabel 필터 */}
                        {teacherList.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-700">
                                교직원 검색
                              </label>
                              {filteredTeachers.length > 0 && (
                                <div className="flex items-center gap-2">
                                  {allFilteredSelected ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={deselectAllFiltered}
                                      className="text-xs h-7 px-2"
                                    >
                                      필터 전체 해제
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={selectAllFiltered}
                                      className="text-xs h-7 px-2"
                                    >
                                      필터 전체 선택
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  type="text"
                                  value={targetTeacherSearchQuery}
                                  onChange={(e) => setTargetTeacherSearchQuery(e.target.value)}
                                  placeholder="교직원 이름, 이메일 또는 직위로 검색 (콤마로 구분: 김철수, 이영희)"
                                  className="w-full"
                                />
                              </div>
                              {uniqueRoleLabels.length > 0 && (
                                <div className="w-40">
                                  <Select
                                    options={[
                                      { value: "", label: "전체 직위" },
                                      ...uniqueRoleLabels.map((roleLabel) => ({
                                        value: roleLabel,
                                        label: roleLabel,
                                      })),
                                    ]}
                                    value={selectedRoleLabelFilter}
                                    onChange={(e) => setSelectedRoleLabelFilter(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {isLoadingTeachers ? (
                          <div className="text-center py-8 text-gray-500">교직원 목록을 불러오는 중...</div>
                        ) : teacherList.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">교직원이 없습니다.</div>
                        ) : filteredTeachers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">검색 결과가 없습니다.</div>
                        ) : (
                          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                            {filteredTeachers.map((teacher) => (
                              <label
                                key={teacher.id}
                                className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedTeacherIds.includes(teacher.id)}
                                  onChange={() => handleTargetTeacherSelect(teacher.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                {teacher.roleLabel && (
                                  <span className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-100 rounded">
                                    {teacher.roleLabel}
                                  </span>
                                )}
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                                  <div className="text-xs text-gray-500">{teacher.email}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {teacherList.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {selectedTeacherIds.length}명 선택됨
                            {(targetTeacherSearchQuery || selectedRoleLabelFilter) && (
                              <span className="ml-2">
                                ({filteredTeachers.length}명 표시됨
                                {selectedFilteredCount > 0 && ` / ${selectedFilteredCount}명 선택됨`}
                                {targetTeacherSearchQuery && ` / 검색: "${targetTeacherSearchQuery}"`}
                                {selectedRoleLabelFilter && ` / 직위: ${selectedRoleLabelFilter}`}
                                )
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // 기존 로직 (재학생/학부모 선택)
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableTargetOptions.map((option) => (
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
                    )}
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
              <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수정 권한
            </label>
            <div className="space-y-2">
              <div className="relative" ref={teacherSearchRef}>
                <Input
                  type="text"
                  placeholder="교사 이름 또는 이메일 검색"
                  value={teacherSearchQuery}
                  onChange={(e) => {
                    setTeacherSearchQuery(e.target.value);
                    setIsTeacherSearchOpen(true);
                  }}
                  onFocus={() => setIsTeacherSearchOpen(true)}
                  className="w-full"
                />
                {isTeacherSearchOpen && teacherOptions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {teacherOptions
                      .filter(t => !editableBy.includes(t.id))
                      .map((teacher) => (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => handleTeacherSelect(teacher)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                          <div className="text-xs text-gray-500">{teacher.email}</div>
                        </button>
                      ))}
              </div>
                )}
              </div>
              {selectedTeachers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
                    >
                      <span>{teacher.name}</span>
                      <button
                        type="button"
                        onClick={() => handleTeacherRemove(teacher.id)}
                        className="hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">
                예약 발행
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={useSchedule}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setUseSchedule(checked);
                    // 예약 발행을 체크하면 기본값 설정, 해제하면 빈 문자열
                    if (checked) {
                      setPublishAt(getDefaultPublishAt());
                    } else {
                      setPublishAt("");
                    }
                  }}
                />
                <span>사용</span>
              </label>
            </div>
            {useSchedule && (
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          </div>
        </div>
      </div>

      {/* 본문 작성 영역 - 설문 조사일 때는 2단 레이아웃 */}
      <div className={cn(
        "grid gap-4",
        category === "survey" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <label className="block text-sm font-medium text-gray-700">
              본문 <span className="ml-1 text-red-500">*</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
            {/* 폰트 크기 드롭다운 */}
            {editor && (
              <div className="relative">
                <select
                  value={editor.getAttributes('textStyle').fontSize || ''}
                  onChange={(e) => {
                    const size = e.target.value;
                    if (!editor) return;
                    
                    if (size === '') {
                      // 기본 크기로 복원
                      editor.chain().focus().unsetMark('textStyle').run();
                    } else {
                      // 폰트 크기 설정
                      editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
                    }
                  }}
                  className="h-9 px-3 pr-8 text-sm rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  title="폰트 크기"
                >
                  {fontSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            )}
            {toolbarItems?.map((item: any, index: number) => {
              // 구분선 처리
              if (item.isDivider) {
                return <div key={`divider-${index}`} className="h-6 w-px bg-gray-300 mx-1" />;
              }
              
              return (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    onClick={item.action}
                    aria-label={item.label}
                    className={cn(
                      "rounded-md p-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500",
                      item.active 
                        ? "bg-blue-500 text-white border-2 border-blue-600 shadow-md font-semibold [&_svg]:text-white" 
                        : "text-gray-500 hover:bg-gray-200 hover:text-gray-700 border-2 border-transparent [&_svg]:text-gray-500"
                    )}
                  >
                    {item.icon}
                  </button>
                  {item.isColorPicker && isColorPickerOpen && (
                  <div
                    ref={colorPickerRef}
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                    style={{ minWidth: '240px' }}
                  >
                    {/* 색깔 제거 옵션 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!editor) return;
                        editor.chain().focus().unsetMark('textStyle').run();
                        setIsColorPickerOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-200 transition-colors"
                    >
                      <Eraser className="h-4 w-4" />
                      <span>색깔 제거</span>
                    </button>
                    
                    {/* 색상 격자: 3행 5열 */}
                    <div className="p-3">
                      <div className="grid grid-cols-5 gap-2">
                        {colorOptions.map((colorOption) => (
                          <button
                            key={colorOption.value}
                            type="button"
                            onClick={() => {
                              if (!editor) return;
                              editor.chain().focus().setMark('textStyle', { color: colorOption.value }).run();
                              setIsColorPickerOpen(false);
                            }}
                            className={cn(
                              "w-8 h-8 rounded border-2 transition-all",
                              editor?.getAttributes('textStyle').color === colorOption.value
                                ? "border-blue-500 ring-2 ring-blue-300 scale-110"
                                : "border-gray-300 hover:border-gray-400 hover:scale-105"
                            )}
                            style={{ 
                              backgroundColor: colorOption.color,
                              borderColor: colorOption.value === '#FFFFFF' ? '#E5E7EB' : undefined
                            }}
                            title={colorOption.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          <EditorContent editor={editor} />
        </div>

        {/* 설문 조사 패널 (survey 선택 시에만 표시) */}
        {category === "survey" && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 h-full flex flex-col">
            {/* 설문 조사 기간 설정 */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">설문 조사 기간</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="datetime-local"
                  label="시작일시"
                  value={surveyStartDate}
                  onChange={(e) => setSurveyStartDate(e.target.value)}
                  className="text-xs"
                />
                <Input
                  type="datetime-local"
                  label="종료일시"
                  value={surveyEndDate}
                  onChange={(e) => setSurveyEndDate(e.target.value)}
                  min={surveyStartDate || undefined}
                  className="text-xs"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-700">설문 조사 항목</h3>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignaturePanel}
                    onChange={(e) => setShowSignaturePanel(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  서명 포함
                </label>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddSurveyQuestion}
                className="h-8 px-3 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                질문 추가
              </Button>
            </div>
            
            {/* 질문 목록 */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
              {surveyQuestions.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  설문 항목을 추가하려면 "질문 추가" 버튼을 클릭하세요.
                </div>
              ) : (
                surveyQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-300 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">
                        질문 {index + 1}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSurveyQuestion(question.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* 질문 타입 선택 */}
                    <div className="mb-2">
                      <Select
                        value={question.type}
                        onChange={(e) => handleUpdateSurveyQuestion(question.id, "type", e.target.value)}
                        options={[
                          { value: "single", label: "객관식 단일 선택" },
                          { value: "multiple", label: "객관식 다중 선택" },
                          { value: "text", label: "주관식 단답" },
                          { value: "textarea", label: "주관식 장문" },
                        ]}
                        className="text-xs h-8"
                      />
                    </div>
                    
                    {/* 질문 내용 입력 */}
                    <div className="mb-2">
                      <Input
                        placeholder="질문을 입력하세요"
                        value={question.question}
                        onChange={(e) => handleUpdateSurveyQuestion(question.id, "question", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    {/* 객관식 선택지 */}
                    {(question.type === "single" || question.type === "multiple") && (
                      <div className="space-y-2 mb-2">
                        {question.options?.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              placeholder={`옵션 ${optIndex + 1}`}
                              value={option}
                              onChange={(e) => handleUpdateSurveyOption(question.id, optIndex, e.target.value)}
                              className="text-sm flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSurveyOption(question.id, optIndex)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                              disabled={question.options && question.options.length <= 2}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddSurveyOption(question.id)}
                          className="w-full h-7 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          옵션 추가
                        </Button>
                      </div>
                    )}
                    
                    {/* 필수 여부 체크박스 */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => handleUpdateSurveyQuestion(question.id, "required", e.target.checked)}
                          className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        필수 항목
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 동의서/설문조사 서명 패널 (consent 선택 시 또는 survey에서 checkbox 체크 시 표시) */}
      {(category === "consent" || (category === "survey" && showSignaturePanel)) && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          {/* 서명 영역 - 2단 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 서명 캔버스 (왼쪽) - 작성자 모드에서는 비활성화 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">서명</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={clearSignature}
                  className="h-8 px-3 text-xs"
                  disabled={true}
                >
                  초기화
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-100 overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[200px] cursor-not-allowed touch-none opacity-50"
                  style={{ pointerEvents: 'none' }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                  <p className="text-xs text-gray-500 text-center px-4">
                    작성자는 서명할 수 없습니다.<br />
                    이 서명 패널은 알림 대상자에게서 작동합니다.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                알림 대상자가 안내문을 확인할 때 서명할 수 있습니다.
              </p>
            </div>
            
            {/* 서명 미리보기 (오른쪽) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">서명 미리보기</h3>
                <div className="h-8"></div> {/* 초기화 버튼과 같은 높이의 공간 */}
              </div>
              <div className="border border-gray-300 rounded-lg bg-white p-2 min-h-[200px] flex items-center justify-center">
                {signatureData ? (
                  <img 
                    src={signatureData} 
                    alt="서명" 
                    className="max-w-full h-auto"
                  />
                ) : (
                  <p className="text-xs text-gray-400 text-center">
                    알림 대상자가 서명하면 여기에 표시됩니다.
                  </p>
                )}
              </div>
              <div className="h-[18px] mt-2"></div> {/* 안내 텍스트와 같은 높이의 공간 */}
            </div>
          </div>
        </div>
      )}

      {/* 첨부 파일 업로드 */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <label
          htmlFor="files"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          첨부 파일 (선택, 여러 개 가능)
        </label>
        <input
          id="files"
          type="file"
          multiple
          onChange={handleFileChange}
          accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.zip,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 placeholder:text-gray-500"
        />
        {files.length > 0 && (
          <ul className="mt-2 text-sm text-gray-700 space-y-1">
            {files.map((f, idx) => (
              <li
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 py-1"
              >
                <span className="truncate">
                  {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSelectedFile(idx)}
                  className="flex-shrink-0 text-xs text-red-600 hover:text-red-700 rounded px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
        {editId && existingAttachments.length > 0 && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">현재 첨부 파일</span>
            </div>
            <ul className="text-sm text-gray-600 pl-1 space-y-1">
              {existingAttachments.map((att, idx) => (
                <li key={`${att.filePath}-${idx}`} className="flex items-center justify-between gap-2 break-all rounded border border-gray-200 bg-gray-50 px-2 py-1">
                  <a
                    href={att.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-blue-600 hover:text-blue-700"
                  >
                    {att.originalFileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          허용 형식: PPT, PPTX, PDF, DOC, DOCX, XLS, XLSX, ZIP, HWP, HWPX, JPG, PNG, GIF, BMP, WEBP, SVG (파일당 최대 50MB)
        </p>
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
      </div>
    </div>
  );
}

