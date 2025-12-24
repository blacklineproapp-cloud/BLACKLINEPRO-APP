interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizes[size]} border-zinc-700 border-t-emerald-500 rounded-full animate-spin`}
      ></div>
      {text && (
        <p className="text-zinc-400 text-sm animate-pulse">{text}</p>
      )}
    </div>
  );
}

// Named export for compatibility
export { LoadingSpinner };
