import CountdownSection from '@/login/components/CountdownSection'

interface CountdownWrapperProps {
  daysRemaining: number
  activeUserCount: number
}

export default function CountdownWrapper({ daysRemaining, activeUserCount }: CountdownWrapperProps) {
  return (  
    <div className="px-0 md:px-4">
        <div className="rounded-lg bg-muted/10 p-6">
          <CountdownSection daysRemaining={daysRemaining} activeUserCount={activeUserCount} />
      </div>
    </div>
  )
} 