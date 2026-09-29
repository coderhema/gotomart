/** Shared landing-page actions (WhatsApp CTAs, smooth scroll). */

export const WHATSAPP_E164 = '2349167575228'

export function whatsappUrl(message) {
  const base = `https://wa.me/${WHATSAPP_E164}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

export const WA = {
  startChatting: whatsappUrl('Hi GoToMart! I want to get started.'),
  startSelling: whatsappUrl('Hi GoToMart! I want to sell on WhatsApp.'),
  startShopping: whatsappUrl('Hi GoToMart! I want to buy something.'),
  becomeVendor: whatsappUrl('Hi GoToMart! I want to become a vendor.'),
  contactSales: whatsappUrl('Hi GoToMart! I would like to speak with sales.'),
  getStarted: whatsappUrl('Hi GoToMart! Get started free.'),
  browseVendors: whatsappUrl('Hi GoToMart! Show me vendors near me.'),
  startChat: whatsappUrl('Hi GoToMart! I want to chat with a vendor.'),
  shopNow: whatsappUrl('Hi GoToMart! I want to shop now.'),
}

export function scrollToId(id) {
  const el = document.getElementById(id.replace(/^#/, ''))
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function onNavClick(event, href) {
  if (!href?.startsWith('#')) return
  event.preventDefault()
  scrollToId(href)
}
