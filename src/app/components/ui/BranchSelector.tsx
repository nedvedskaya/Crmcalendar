interface BranchSelectorProps {
  value: string | null | undefined;
  onChange: (branch: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const BranchSelector = ({ 
  value, 
  onChange, 
  size = 'md' 
}: BranchSelectorProps) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm'
  };

  const handleToggle = (branch: 'msk' | 'rnd') => {
    onChange(value === branch ? null : branch);
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => handleToggle('msk')}
        className={`${sizeClasses[size]} rounded-xl font-bold transition-all ${
          value === 'msk'
            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
            : 'bg-zinc-100 text-zinc-400'
        }`}
      >
        МСК
      </button>
      <button
        type="button"
        onClick={() => handleToggle('rnd')}
        className={`${sizeClasses[size]} rounded-xl font-bold transition-all ${
          value === 'rnd'
            ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/30'
            : 'bg-zinc-100 text-zinc-400'
        }`}
      >
        РНД
      </button>
    </div>
  );
};