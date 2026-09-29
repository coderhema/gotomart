const images = [
  '/images/stock-1-efa4e89d.jpg',
  '/images/stock-2-ec8fc9d4.jpg',
  '/images/stock-3-45e7bb17.jpg',
  '/images/stock-4-2d5f6ed7.jpg',
  '/images/stock-5-64c3c232.jpg',
]

function ImageStrip() {
  return (
    <section aria-label="Marketplace moments" className="w-full h-[120px] sm:h-[140px] flex gap-1 bg-cream-dark overflow-hidden">
      {images.map((src) => (
        <div
          key={src}
          className="flex-1 min-w-0 h-full bg-center bg-cover bg-no-repeat"
          style={{ backgroundImage: `url('${src}')` }}
          role="img"
          aria-hidden="true"
        />
      ))}
    </section>
  )
}

export default ImageStrip
