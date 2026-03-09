import type { CSSProperties } from 'react'

interface MotionDemoProps {
  accent: string
  title: string
  caption: string
}

export function MotionDemo({ accent, title, caption }: MotionDemoProps) {
  return (
    <div className="motion-demo" style={{ '--accent': accent } as CSSProperties}>
      <div className="motion-demo__stage" aria-hidden="true">
        <div className="motion-demo__orb motion-demo__orb--left" />
        <div className="motion-demo__orb motion-demo__orb--right" />
        <div className="motion-demo__trail" />
      </div>
      <h3>{title}</h3>
      <p>{caption}</p>
    </div>
  )
}
