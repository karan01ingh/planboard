export default function AdminPanel({ users, socket, onClose }) {
  const handleRoleChange = (username, newRole) => {
    socket.emit('change-role', { username, newRole })
  }

  return (
    <div className="fixed top-20 right-5 bg-white rounded-lg shadow-2xl p-5 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: user.color || '#6b7280' }}
              ></div>
              <span className="font-medium text-gray-700">{user.username}</span>
            </div>
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(user.username, e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-gray-500 text-center py-4">No users online</p>
        )}
      </div>
    </div>
  )
}