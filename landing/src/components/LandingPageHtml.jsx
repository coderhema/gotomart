/**
 * Renders the full Pencil-exported GotoMart landing page (public/landing.html).
 * Uses Tailwind CDN because the design relies on arbitrary utility classes
 * that are not present in the React source tree for JIT scanning.
 */

import { useEffect, useRef, useState } from 'react'

const TAILWIND_CDN = 'https://cdn.tailwindcss.com'
const LANDING_HTML_URL = '/landing.html'

function ensureHeadAssets() {
  if (!document.querySelector('script[data-gotomart-tailwind]')) {
    const cfg = document.createElement('script')
    cfg.dataset.gotomartTailwind = 'config'
    cfg.textContent = 'tailwind = { config: { corePlugins: { preflight: false } } };'
    document.head.appendChild(cfg)

    const tw = document.createElement('script')
    tw.dataset.gotomartTailwind = 'cdn'
    tw.src = TAILWIND_CDN
    document.head.appendChild(tw)
  }

  if (!document.querySelector('link[data-gotomart-inter]')) {
    const pre1 = document.createElement('link')
    pre1.rel = 'preconnect'
    pre1.href = 'https://fonts.googleapis.com'
    pre1.dataset.gotomartInter = '1'
    document.head.appendChild(pre1)

    const pre2 = document.createElement('link')
    pre2.rel = 'preconnect'
    pre2.href = 'https://fonts.gstatic.com'
    pre2.crossOrigin = 'anonymous'
    pre2.dataset.gotomartInter = '1'
    document.head.appendChild(pre2)

    const font = document.createElement('link')
    font.rel = 'stylesheet'
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap'
    font.dataset.gotomartInter = '1'
    document.head.appendChild(font)
  }

  if (!document.querySelector('style[data-gotomart-landing]')) {
    const style = document.createElement('style')
    style.dataset.gotomartLanding = '1'
    style.textContent = `
      html, body, #root {
        margin: 0;
        min-height: 100%;
        background: #faf9f6;
      }
      .gotomart-landing-shell {
        width: 100%;
        overflow-x: auto;
        background: #faf9f6;
      }
      .gotomart-landing-shell [data-pencil-name="GotoMart Landing Page"] {
        margin-left: auto;
        margin-right: auto;
      }
      @media (max-width: 1440px) {
        .gotomart-landing-shell [data-pencil-name="GotoMart Landing Page"] {
          min-width: 1440px;
        }
      }
    `
    document.head.appendChild(style)
  }
}

function extractLandingRoot(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const root =
    doc.querySelector('[data-pencil-name="GotoMart Landing Page"]') ||
    doc.body?.firstElementChild ||
    null
  return root ? root.outerHTML : html
}

function LandingPageHtml() {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ensureHeadAssets()

    fetch(LANDING_HTML_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load landing.html (${res.status})`)
        return res.text()
      })
      .then((html) => {
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = extractLandingRoot(html)
        setLoading(false)
        window.setTimeout(() => {
          if (window.tailwind && typeof window.tailwind.refresh === 'function') {
            window.tailwind.refresh()
          }
        }, 100)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setError(err.message || 'Failed to load landing page')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-8">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="gotomart-landing-shell w-full min-h-screen">
      {loading && (
        <div className="p-8 text-sm text-[#585858] font-[Inter,system-ui,sans-serif]">
          Loading design…
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}

export default LandingPageHtml
