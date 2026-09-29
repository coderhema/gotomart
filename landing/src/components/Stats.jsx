import { useEffect, useRef, useState } from 'react'

const stats = [
  { end: 5000, suffix: '+', label: 'Active Vendors' },
  { end: 50000, suffix: '+', label: 'Monthly Orders' },
  { end: 95, suffix: '%', label: 'Satisfaction' },
]

function formatCount(value) {
  return Math.round(value).toLocaleString('en-US')
}

function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35, ...options }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options.rootMargin, options.threshold])

  return [ref, inView]
}

function CountUp({ end, suffix = '', active, duration = 1600 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    let frame = 0
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - (1 - progress) ** 3
      setDisplay(end * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, end, duration])

  return (
    <span>
      {formatCount(display)}
      {suffix}
    </span>
  )
}

function Stats() {
  const [sectionRef, inView] = useInView()

  return (
    <section
      ref={sectionRef}
      className="w-full bg-cream px-4 sm:px-10 lg:px-20 py-12 sm:py-16 lg:py-20"
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-8 sm:gap-10">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-gray-900 max-w-2xl">
          Join thousands of vendors growing their business
        </h2>
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 justify-items-center">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 items-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-light text-navy tabular-nums">
                <CountUp end={stat.end} suffix={stat.suffix} active={inView} />
              </div>
              <div className="text-xs sm:text-sm text-gray-text">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats
