export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[300px] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-10 h-10 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-[#E5EAF2] rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-[#2563EB] rounded-full animate-spin" />
        </div>
        <p className="text-sm text-[#64748B]">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
          <Icon className="w-8 h-8 text-[#94A3B8]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#0F172A] mb-1.5">{title}</h3>
      {description && <p className="text-sm text-[#64748B] mb-4">{description}</p>}
      {action}
    </div>
  );
}

export default LoadingSpinner;
