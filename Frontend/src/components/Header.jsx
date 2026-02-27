export default function Header({ board, user, activeUsers, connected, onShare, onManage, onLogout }) {
  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="bg-white px-5 py-3 shadow-md flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-indigo-600">📋 PlanBoard</h1>
        <span className="text-gray-400">|</span>
        <span className="text-gray-700 font-medium">{board.name}</span>
      </div>

      <div className="flex items-center gap-4">
        {connected && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online</span>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full">
          <span className="text-sm font-medium">{user.username}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleColors[user.role]}`}>
            {user.role.toUpperCase()}
          </span>
        </div>

        <button
          onClick={onShare}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
        >
          📤 Share
        </button>

        {user.role === 'admin' && (
          <button
            onClick={onManage}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
          >
            ⚙️ Manage
          </button>
        )}

        <button
          onClick={onLogout}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </div>
  )
}