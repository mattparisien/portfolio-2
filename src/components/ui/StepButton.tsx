function StepButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-7 h-7 rounded-md bg-black/[0.04] hover:bg-black/[0.09] flex items-center justify-center text-gray-500 transition-colors cursor-pointer flex-shrink-0"
    >
      {children}
    </button>
  );
}

export default StepButton;