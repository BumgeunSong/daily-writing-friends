import { Input } from "@/shared/ui/input"
import { Textarea } from "@/shared/ui/textarea"
import type { FieldError, FieldValues, UseFormRegister } from "react-hook-form"

interface FormFieldProps {
  id: string
  label: string
  /**
   * When set to "sr-only", the label is rendered for screen readers only.
   * Use this when the visible UI already names the field (e.g. a segmented
   * control above the input) but the input still needs an accessible name.
   */
  labelClassName?: string
  type: string
  inputMode: "text" | "numeric" | "tel" | "email" | "url" | "search" | "none"
  placeholder: string
  autoComplete?: string
  register: UseFormRegister<FieldValues>
  error?: FieldError
  optional?: boolean
}

export default function FormField({
  id,
  label,
  labelClassName,
  type,
  inputMode,
  placeholder,
  autoComplete,
  register,
  error,
  optional,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className={labelClassName ?? "block text-sm font-medium lg:text-base"}
        >
          {label} {optional && <span className="text-sm text-muted-foreground">(선택)</span>}
        </label>
      )}
      {type === "textarea" ? (
        <Textarea
          id={id}
          {...register(id)}
          placeholder={placeholder}
          className="min-h-[100px] rounded-md text-base transition-shadow focus-visible:ring-slate-400"
        />
      ) : (
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          {...register(id)}
          placeholder={placeholder}
          className="h-12 rounded-md text-base transition-shadow focus-visible:ring-slate-400 lg:h-14"
        />
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  )
}
