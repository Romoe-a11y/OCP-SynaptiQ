import {
  BellRing,
  Brain,
  Cpu,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const adminNavigation: NavigationGroup[] = [
  {
    label: "Monitor",
    items: [
      { label: "Overview", to: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Alerts", to: "/admin/alerts", icon: BellRing },
      { label: "Anomalies", to: "/admin/anomalies", icon: TriangleAlert },
      { label: "Predictions", to: "/admin/predictions", icon: TrendingUp },
      { label: "AI Diagnosis", to: "/admin/ai-diagnosis", icon: Brain },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Actions", to: "/admin/actions", icon: Wrench },
      { label: "Thresholds", to: "/admin/thresholds", icon: SlidersHorizontal },
      { label: "Export CSV", to: "/admin/export", icon: Download },
      { label: "Report", to: "/admin/report", icon: FileText },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

export const userNavigation: NavigationGroup[] = [
  {
    label: "Monitor",
    items: [
      { label: "Overview", to: "/user/dashboard", icon: LayoutDashboard },
      { label: "Motors", to: "/user/motors", icon: Cpu },
      { label: "Alerts", to: "/user/alerts", icon: BellRing },
      { label: "Anomalies", to: "/user/anomalies", icon: TriangleAlert },
      { label: "Predictions", to: "/user/predictions", icon: TrendingUp },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "History", to: "/user/history", icon: History },
      { label: "AI Diagnosis", to: "/user/ai-diagnosis", icon: Brain },
      { label: "Report", to: "/user/report", icon: FileText },
    ],
  },
];
