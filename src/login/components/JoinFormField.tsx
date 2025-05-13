import { Input } from "@shared/ui/input"
import type { FieldError, UseFormRegister } from "react-hook-form"

interface FormFieldProps {
  id: string
  label: string
  type: string
  inputMode: "text" | "numeric" | "tel" | "email" | "url" | "search" | "none"
  placeholder: string
  register: UseFormRegister<any>
  error?: FieldError
  optional?: boolean
}

export default function FormField({
  id,
  label,
  type,
  inputMode,
  placeholder,
  register,
  error,
  optional,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium lg:text-base">
        {label} {optional && <span className="text-sm text-muted-foreground">(선택)</span>}
      </label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        {...register(id)}
        placeholder={placeholder}
        className="h-12 rounded-md text-base transition-all focus-visible:ring-slate-400 lg:h-14"
      />
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  )
}
