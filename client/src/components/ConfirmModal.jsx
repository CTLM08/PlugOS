import { Icon } from '@iconify/react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  loading = false
}) {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: 'mdi:alert-circle',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      buttonBg: 'bg-red-600 hover:bg-red-500'
    },
    warning: {
      icon: 'mdi:alert',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      buttonBg: 'bg-amber-600 hover:bg-amber-500'
    },
    info: {
      icon: 'mdi:information',
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-400',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-500'
    }
  };

  const style = variants[variant] || variants.danger;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md animate-scaleIn">
        <div className="p-6">
          {/* Icon */}
          <div className={`w-14 h-14 ${style.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon icon={style.icon} className={`w-7 h-7 ${style.iconColor}`} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-center mb-2">{title}</h3>

          {/* Message */}
          <p className="text-[var(--color-text-muted)] text-center text-sm">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex border-t border-[var(--color-border)] overflow-hidden rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)] transition-colors font-medium border-r border-[var(--color-border)] disabled:opacity-50 rounded-bl-2xl"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 text-white font-medium transition-colors ${style.buttonBg} disabled:opacity-50 flex items-center justify-center gap-2 rounded-br-2xl`}
          >
            {loading && <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
