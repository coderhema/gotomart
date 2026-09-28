/**
 * This component embeds the landingpage.html content
 * Uses the full HTML design exported from Figma/Pen tool
 */

import { useEffect, useRef } from 'react'

function LandingPageHtml() {
  const containerRef = useRef(null)

  useEffect(() => {
    // Load the HTML content
    fetch('/landing.html')
      .then(res => res.text())
      .then(html => {
        if (containerRef.current) {
          containerRef.current.innerHTML = html
          // Remove the body tag wrapper style issues
          const bodyContent = containerRef.current.querySelector('body > div')
          if (bodyContent) {
            containerRef.current.innerHTML = bodyContent.outerHTML
          }
        }
      })
      .catch(err => {
        console.error('Failed to load landing.html:', err)
      })
  }, [])

  return (
    <div 
      ref={containerRef}
      className="w-full"
      style={{ 
        minHeight: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    />
  )
}

export default LandingPageHtml
