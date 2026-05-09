import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Memory from './pages/games/Memory'
import Nback from './pages/games/Nback'
import Corsi from './pages/games/Corsi'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/games/memory" element={<Memory />} />
            <Route path="/games/nback" element={<Nback />} />
            <Route path="/games/corsi" element={<Corsi />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
