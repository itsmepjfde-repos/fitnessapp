import { FormEvent, useState } from 'react';
import { LoaderCircle, UserPlus, X } from 'lucide-react';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onAddMember: (input: {
    name: string;
    phone: string;
  }) => Promise<boolean>;
  isSubmitting: boolean;
}

export function AddMemberModal({
  open,
  onClose,
  onAddMember,
  isSubmitting,
}: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter the athlete full name.');
      return;
    }
    if (phone.trim().length < 7) {
      setError('Please enter a valid contact phone number.');
      return;
    }
    const added = await onAddMember({
      name: name.trim(),
      phone: phone.trim(),
    });
    if (!added) return;
    setName('');
    setPhone('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
    >
      <div className="w-full max-w-md rounded-lg border border-white/15 bg-[#131C2E] shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_24px_48px_-12px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0D1422]">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#EF233C]" />
            <h2
              id="add-member-title"
              className="font-display text-lg font-bold text-[#DFE2EF]"
            >
              Enroll New Member
            </h2>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded text-[#9AA7B8] hover:text-white hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="new-member-name"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#9AA7B8] mb-1.5"
            >
              Athlete Full Name
            </label>
            <input
              id="new-member-name"
              type="text"
              autoFocus
              disabled={isSubmitting}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Jordan Vega"
              className="w-full h-10 px-3 rounded bg-[#0B0F19] border border-white/12 text-sm text-[#DFE2EF] placeholder:text-[#64748B] kinetic-focus"
            />
          </div>

          <div>
            <label
              htmlFor="new-member-phone"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#9AA7B8] mb-1.5"
            >
              Contact Number
            </label>
            <input
              id="new-member-phone"
              type="tel"
              value={phone}
              disabled={isSubmitting}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              placeholder="+1 (555) 234-8910"
              className="w-full h-10 px-3 rounded bg-[#0B0F19] border border-white/12 text-sm font-mono text-[#DFE2EF] placeholder:text-[#64748B] kinetic-focus"
            />
          </div>


          {error && (
            <p className="text-xs text-[#FCA5A5] bg-[#EF4444]/12 border border-[#EF4444]/35 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded border border-white/15 bg-transparent hover:bg-white/[0.05] text-sm text-[#DFE2EF] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="px-4 py-2 rounded bg-[#E62020] hover:bg-[#EF3333] text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Adding member...
                </span>
              ) : (
                'Add Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
