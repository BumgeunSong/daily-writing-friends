import { passwordHint } from '@/login/utils/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const { text, ok } = passwordHint(password);
  return (
    <p
      className={
        ok
          ? 'text-xs text-green-600 dark:text-green-400'
          : 'text-xs text-muted-foreground'
      }
    >
      {text}
    </p>
  );
}
