import { Link, useLocation } from 'react-router-dom'

export default function NavBar() {
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: '🏠 ホーム' },
    { to: '/dashboard', label: '📊 統計' },
  ]

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-[#6c63ff]">🧠 BrainTrain</Link>
        <div className="flex gap-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-semibold px-3 py-1 rounded-full transition-colors duration-150 ${
                pathname === link.to
                  ? 'bg-[#6c63ff] text-white'
                  : 'text-gray-500 hover:text-[#6c63ff]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
