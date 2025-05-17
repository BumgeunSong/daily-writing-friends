import CountdownSection from '@/shared/components/CountdownSection'

interface CountdownWrapperProps {
  daysRemaining: number
}

export default function CountdownWrapper({ daysRemaining }: CountdownWrapperProps) {
  return (
    <div className="px-0 md:px-4">
      <div className="rounded-lg bg-muted/10 p-6">
        <CountdownSection daysRemaining={daysRemaining} />
      </div>
    </div>
  )
} 