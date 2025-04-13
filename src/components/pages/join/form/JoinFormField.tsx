import { Input } from "@/components/ui/input"
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
      <label htmlFor={id} className="text-sm lg:text-base font-medium block">
        {label} {optional && <span className="text-muted-foreground text-sm">(선택)</span>}
      </label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        {...register(id)}
        placeholder={placeholder}
        className="h-12 lg:h-14 text-base rounded-md transition-all focus-visible:ring-slate-400"
      />
      {error && <p className="text-sm text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}
