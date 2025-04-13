import CountdownSection from "./CountdownSection"

interface CountdownWrapperProps {
  daysRemaining: number
}

export default function CountdownWrapper({ daysRemaining }: CountdownWrapperProps) {
  return (
    <div className="px-0 md:px-4">
      <div className="bg-muted/10 p-6 rounded-lg">
        <CountdownSection daysRemaining={daysRemaining} />
      </div>
    </div>
  )
} 