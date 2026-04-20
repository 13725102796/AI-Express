'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({
  message,
  visible,
  onHide,
  duration = 2000,
  type = 'success',
}: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onHide, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible && !show) return null;

  const bgColor = type === 'success'
    ? 'var(--color-success)'
    : type === 'error'
    ? 'var(--color-error)'
    : 'var(--color-bg-tertiary)';

  return (
    <div
      className="fixed bottom-24 left-1/2 z-50 px-6 py-3 rounded-full text-sm font-display"
      style={{
        transform: `translateX(-50%) translateY(${show ? '0' : '20px'})`,
        opacity: show ? 1 : 0,
        transition: 'all 300ms var(--ease-out-quart)',
        background: bgColor,
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {type === 'success' && '✓ '}{message}
    </div>
  );
}
