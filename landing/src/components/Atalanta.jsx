function Atalanta({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo icon */}
      <div className="w-8 h-8 bg-navy rounded flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </div>
      
      {/* Atalanta brand name */}
      <span className="text-sm font-semibold italic text-gray-900 tracking-tight">
        Ata<span className="mx-0.5">•</span>la<span className="mx-0.5">•</span>n<span className="mx-0.5">•</span>ta
      </span>
    </div>
  )
}

export default Atalanta
