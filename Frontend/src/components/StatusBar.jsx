export default function StatusBar({ board, connected }) {
  return (
    <div className="bg-white px-5 py-2 shadow-md flex justify-between items-center text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{connected ? 'Real-time sync active' : 'Disconnected'}</span>
      </div>
      <div>
        <span>Board: {board.name}</span>
      </div>
    </div>
  )
}