
function ToggleButton({
  active,
  title,
  onClick,
  children,
  style,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={style}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-150 select-none cursor-pointer flex-shrink-0 ${active
        ? "bg-black text-white shadow-sm"
        : "hover:bg-black/[0.07] text-gray-600 hover:text-gray-900"
        }`}
    >
      {children}
    </button>
  );
}

export default ToggleButton;