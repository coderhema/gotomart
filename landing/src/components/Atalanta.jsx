import { Storefront } from '@phosphor-icons/react'

function Atalanta({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-8 h-8 bg-navy rounded flex items-center justify-center shrink-0">
        <Storefront weight="duotone" className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <span className="text-sm font-semibold italic text-gray-900 tracking-tight">
        Ata<span className="mx-0.5">•</span>la<span className="mx-0.5">•</span>n
        <span className="mx-0.5">•</span>ta
      </span>
    </div>
  )
}

export default Atalanta
