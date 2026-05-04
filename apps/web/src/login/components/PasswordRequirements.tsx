import { passwordChecks } from '@/login/utils/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (!password) {
    return (
      <p className='text-xs text-muted-foreground'>
        8자 이상, 영문과 숫자를 포함해주세요.
      </p>
    );
  }

  const checks = passwordChecks(password);
  const rules: Array<[boolean, string]> = [
    [checks.isLongEnough, '8자 이상'],
    [checks.hasLetter, '영문 포함'],
    [checks.hasNumber, '숫자 포함'],
  ];

  return (
    <ul className='space-y-1 text-xs'>
      {rules.map(([ok, label]) => (
        <li
          key={label}
          className={ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
        >
          {ok ? '✓' : '○'} {label}
        </li>
      ))}
    </ul>
  );
}
