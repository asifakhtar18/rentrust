'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/primitives';

export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  required = true,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ToggleIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
