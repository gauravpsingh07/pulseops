type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({ title = "Something went wrong", message }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
