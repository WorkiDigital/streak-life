import { useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

export default function ChatFAB() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (pathname === '/chat') return null

  return (
    <button
      className="chat-fab"
      onClick={() => navigate('/chat')}
      aria-label="Abrir chat com IA"
    >
      <MessageCircle size={22} />
    </button>
  )
}
