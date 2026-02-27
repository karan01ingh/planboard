import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [boardName, setBoardName] = useState('Main Board')
  const [role, setRole] = useState('editor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    if (!boardName.trim()) {
      setError('Please enter a board name')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/boards/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          boardName: boardName.trim(),
          username: username.trim(),
          role
        })
      })

      const data = await response.json()

      if (data.success) {
        onLogin(data.board, data.user)
      } else {
        setError(data.error || 'Failed to join board')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Failed to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">📋 PlanBoard</h1>
          <p className="text-gray-600">Real-time collaborative whiteboard</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <strong className="block mb-2">💡 How to collaborate:</strong>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter your name and board name below</li>
            <li>Share the <strong>board name</strong> with teammates</li>
            <li>Others use the same board name to join</li>
            <li>All changes sync in real-time!</li>
          </ol>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board Name
            </label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="e.g., Sprint Planning"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              disabled={loading}
            >
              <option value="editor">Editor (Can draw and edit)</option>
              <option value="viewer">Viewer (Can only view)</option>
              <option value="admin">Admin (Full control)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Board'}
          </button>
        </form>
      </div>
    </div>
  )
}