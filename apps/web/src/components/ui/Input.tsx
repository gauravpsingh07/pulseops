import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ className = "", id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm font-medium text-ink-700">{label}</span> : null}
      <input
        id={inputId}
        className={`min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-pulse-500 focus:ring-4 focus:ring-pulse-100 ${className}`}
        {...props}
      />
    </label>
  );
}
