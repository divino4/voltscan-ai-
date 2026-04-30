import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        active 
          ? 'bg-technical-ink text-technical-bg' 
          : 'hover:bg-technical-ink hover:text-technical-bg'
      }`}
    >
      <Icon size={18} />
      <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
      {active && <div className="ml-auto w-1 h-1 bg-technical-accent" />}
    </button>
  );
}
