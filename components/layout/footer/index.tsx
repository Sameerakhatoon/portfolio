import { Link } from '@/components/ui/link'

export function Footer() {
  return (
    <footer
      className="relative flex dt:flex-row flex-col items-center justify-between gap-3 px-safe py-6 text-center"
      style={{ zIndex: 'var(--z-content)' }}
    >
      <span className="font-body text-secondary text-xs uppercase tracking-widest opacity-40">
        &copy; {new Date().getFullYear()} Sameera Khatoon
      </span>
      <div className="flex flex-wrap justify-center gap-6">
        <Link
          href="https://github.com/Sameerakhatoon"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-secondary text-xs uppercase tracking-widest opacity-40 transition-opacity hover:opacity-100"
        >
          GitHub
        </Link>
        <Link
          href="https://www.linkedin.com/in/sameera-khatoon/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-secondary text-xs uppercase tracking-widest opacity-40 transition-opacity hover:opacity-100"
        >
          LinkedIn
        </Link>
      </div>
    </footer>
  )
}
