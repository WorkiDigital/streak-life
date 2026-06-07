import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import ChatFAB from './ChatFAB'

export default function AppLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <ChatFAB />
      <BottomNav />
    </>
  )
}
