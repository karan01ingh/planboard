export default function CursorOverlay({ cursors, canvasRef }) {
  if (!canvasRef.current) return null

  const rect = canvasRef.current.getBoundingClientRect()

  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.socketId}
          className="absolute transition-all duration-100"
          style={{
            left: rect.left + cursor.x,
            top: rect.top + cursor.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: cursor.color }}
            ></div>
            <div className="bg-black bg-opacity-80 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
              {cursor.username}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}