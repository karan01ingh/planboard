import { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import Whiteboard from './components/Whiteboard'
import { SocketProvider } from './context/SocketContext'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [boardData, setBoardData] = useState(null)
  const [userData, setUserData] = useState(null)

  const handleLogin = (board, user) => {
    setBoardData(board)
    setUserData(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setBoardData(null)
    setUserData(null)
  }

  return (
    <SocketProvider>
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <Whiteboard 
          board={boardData} 
          user={userData} 
          onLogout={handleLogout}
        />
      )}
    </SocketProvider>
  )
}

export default App