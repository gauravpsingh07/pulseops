type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-sm font-medium text-ink-500">
      {label}
    </div>
  );
}
