import { CheckmarkIcon } from "../Icons";

interface ToolPopoverItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const ToolPopover = ({
  popoverRef,
  items,
  style,
}: {
  popoverRef?: React.RefObject<HTMLDivElement | null>;
  items: ToolPopoverItem[];
  style?: React.CSSProperties;
}) => {
  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col gap-0 p-2 rounded-lg bg-fg"
      style={{ ...style }}
    >
      {items.map(({ key, icon, label, active, onClick }) => (
        <button
          key={key}
          title={label}
          aria-label={label}
          onClick={onClick}
          className="flex items-center justify-between gap-3 p-2 rounded-md transition-colors flex-1 min-w-[52px] cursor-pointer text-bg hover:bg-accent"
        >
          <div className="w-[10px] shrink-0">{active && <CheckmarkIcon width={10} height={10} pathClassName="stroke-white stroke-1" />}</div>
          <div className="flex flex-1 gap-2 items-center">
            {icon}
            <span className="text-xs leading-none text-bg">{label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default ToolPopover;