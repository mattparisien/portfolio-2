function Label({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-semibold tracking-normal text--fg/60 mb-2 select-none">
            {children}
        </p>
    );
}

export default Label;