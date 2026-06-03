export interface AppSidebarProps {
  variant?: "home" | "settings" | "credit";
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}
