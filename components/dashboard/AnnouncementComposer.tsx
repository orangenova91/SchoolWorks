"use client";

import { FormEvent, useState, useEffect, useRef, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import UnderlineExtension from "@tiptap/extension-underline";
import TiptapImage from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Undo, Redo, Send, ChevronDown, X, Check, Plus, Trash2, Type, Image as ImageIcon } from "lucide-react";
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

const targetOptions = [
  { value: "students", label: "모든 재학생" },
  { value: "parents", label: "모든 학부모" },
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

const categoryOptions = [
  { value: "notice", label: "단순 알림" },
  { value: "survey", label: "설문 조사" },
  { value: "consent", label: "동의서" },
];

// 선택된 대상들을 audience 값으로 변환 (기본값 계산)
const convertTargetsToAudience = (selectedTargets: string[]): string => {
  if (selectedTargets.length === 0) return "";
  if (selectedTargets.length === 1) {
    return selectedTargets[0] === "students" ? "all" : selectedTargets[0];
  }
  // 여러 개 선택된 경우 첫 번째 값을 사용 (하위 호환성)
  return selectedTargets[0] === "students" ? "all" : selectedTargets[0];
};

// selectedClasses와 parentSelectedClasses를 기반으로 정확한 audience 값 계산
const calculateAudienceFromClasses = (
  selectedTargets: string[],
  selectedClasses: SelectedClass[],
  parentSelectedClasses: SelectedClass[]
): string => {
  const hasStudents = selectedTargets.includes("students");
  const hasParents = selectedTargets.includes("parents");

  // 학부모만 선택된 경우
  if (!hasStudents && hasParents) {
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
  if (audience === "parents" || audience === "teachers") {
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

const getDefaultPublishAt = () =>
  new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

interface ConsentData {
  signatureImage?: string; // Base64 이미지 (선택사항)
  signedAt?: string; // 서명 일시 (선택사항)
  requiresSignature?: boolean; // 서명이 필요한지 여부 (설문 조사에서 서명 포함 체크 시)
}

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
  surveyData?: SurveyQuestion[];
  surveyStartDate?: string;
  surveyEndDate?: string;
  consentData?: ConsentData;
  editableBy?: string[];
}

interface AnnouncementComposerProps {
  authorName: string;
  onPreview?: (payload: AnnouncementComposerPayload) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showButton?: boolean;
  editId?: string; // 수정 모드일 때 안내문 ID
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
  const [editorUpdateKey, setEditorUpdateKey] = useState(0);
  const teacherSearchRef = useRef<HTMLDivElement>(null);
  const targetModalRef = useRef<HTMLDivElement>(null);
  const classSelectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // category 변경 시 showSignaturePanel 초기화 (동의서가 아닌 경우)
  useEffect(() => {
    if (category !== "consent" && category !== "survey") {
      setShowSignaturePanel(false);
    } else if (category === "consent") {
      setShowSignaturePanel(true);
    }
  }, [category]);

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

    // selectedClasses와 parentSelectedClasses를 기반으로 정확한 audience 값 계산
    const audience = calculateAudienceFromClasses(
      selectedTargets,
      selectedTargets.includes("students") ? selectedClasses : [],
      selectedTargets.includes("parents") ? parentSelectedClasses : []
    );

    const payload: AnnouncementComposerPayload = {
      title: title.trim(),
      category: category || undefined,
      audience,
      author: authorName.trim(),
      content,
      isScheduled: useSchedule,
      publishAt: useSchedule && publishAt.trim() ? publishAt : undefined,
      selectedClasses: selectedTargets.includes("students") ? selectedClasses : [],
      parentSelectedClasses: selectedTargets.includes("parents") ? parentSelectedClasses : [],
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">안내문을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            {editId ? "안내문 수정" : "새 안내문 작성"}
          </p>
          <h2 className="text-xl font-bold text-gray-900">{editId ? "안내문 수정" : "안내문 입력"}</h2>
          <p className="text-sm text-gray-500">제목과 대상을 지정한 뒤 본문을 자유롭게 작성할 수 있어요.</p>
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
            <Select
              label="구분"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
              required
            />
          </div>
          <div className="flex-1">
            <Input
              label="제목"
              placeholder="예: 11월 학부모 상담 안내"
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
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">수정 권한</p>
                <p className="text-xs text-gray-500">다른 교사에게 수정 권한 부여 (선택사항)</p>
              </div>
            </div>
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
            {toolbarItems?.map((item) => (
              <button
                key={item.label}
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
            ))}
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
  );
}

