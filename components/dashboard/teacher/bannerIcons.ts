import type { ComponentType } from "react";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  MessageSquare,
  Home,
  GraduationCap,
  ClipboardList,
  Award,
  Bell,
  Search,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  UtensilsCrossed,
  Coffee,
  Radio,
  Mic,
  ClipboardCheck,
  ListChecks,
  FileSearch,
  User,
  UserCircle,
  UsersRound,
} from "lucide-react";

export type BannerIconOption = {
  name: string;
  component: ComponentType<{ className?: string }>;
};

/** Single source for teacher banner icon picker (editor + quick modal). */
export const AVAILABLE_BANNER_ICONS: BannerIconOption[] = [
  { name: "BookOpen", component: BookOpen },
  { name: "Users", component: Users },
  { name: "Calendar", component: Calendar },
  { name: "FileText", component: FileText },
  { name: "Settings", component: Settings },
  { name: "BarChart3", component: BarChart3 },
  { name: "MessageSquare", component: MessageSquare },
  { name: "Home", component: Home },
  { name: "GraduationCap", component: GraduationCap },
  { name: "ClipboardList", component: ClipboardList },
  { name: "Award", component: Award },
  { name: "Bell", component: Bell },
  { name: "Search", component: Search },
  { name: "HelpCircle", component: HelpCircle },
  { name: "Mail", component: Mail },
  { name: "Phone", component: Phone },
  { name: "MapPin", component: MapPin },
  { name: "LinkIcon", component: LinkIcon },
  { name: "UtensilsCrossed", component: UtensilsCrossed },
  { name: "Coffee", component: Coffee },
  { name: "Radio", component: Radio },
  { name: "Mic", component: Mic },
  { name: "ClipboardCheck", component: ClipboardCheck },
  { name: "ListChecks", component: ListChecks },
  { name: "FileSearch", component: FileSearch },
  { name: "User", component: User },
  { name: "UserCircle", component: UserCircle },
  { name: "UsersRound", component: UsersRound },
];

export { HelpCircle };
