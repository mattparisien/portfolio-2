const Group = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="px-4 pt-3 pb-3">
      {children}
    </div>
  );
}

export default Group;