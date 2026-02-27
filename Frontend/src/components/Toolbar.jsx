export default function Toolbar({ 
  tool, setTool, color, setColor, size, setSize, fill, setFill,
  onUndo, onRedo, onClear, disabled 
}) {
  const tools = [
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'highlighter', icon: '🖍️', label: 'Highlighter' },
    { id: 'eraser', icon: '🧹', label: 'Eraser' }
  ]

  const shapes = [
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
    { id: 'circle', icon: '⬤', label: 'Circle' },
    { id: 'triangle', icon: '▲', label: 'Triangle' },
    { id: 'diamond', icon: '◆', label: 'Diamond' },
    { id: 'star', icon: '★', label: 'Star' },
    { id: 'hexagon', icon: '⬡', label: 'Hexagon' },
    { id: 'arrow', icon: '→', label: 'Arrow' },
    { id: 'line', icon: '―', label: 'Line' }
  ]

  return (
    <div className="bg-white px-5 py-4 shadow-md flex flex-wrap gap-5 items-center">
      {/* Tools */}
      <div className="flex gap-2 items-center pr-5 border-r border-gray-200">
        <span className="text-sm font-medium text-gray-600">Tool:</span>
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg border-2 transition flex items-center gap-1 ${
              tool === t.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-gray-300 hover:border-indigo-600 hover:bg-indigo-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>{t.icon}</span>
            <span className="text-sm">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Shapes */}
      <div className="flex gap-2 items-center pr-5 border-r border-gray-200">
        <span className="text-sm font-medium text-gray-600">Shape:</span>
        {shapes.map(s => (
          <button
            key={s.id}
            onClick={() => setTool(s.id)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg border-2 transition ${
              tool === s.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-gray-300 hover:border-indigo-600 hover:bg-indigo-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={s.label}
          >
            <span className="text-lg">{s.icon}</span>
          </button>
        ))}
      </div>

      {/* Text Tool */}
      <div className="flex gap-2 items-center pr-5 border-r border-gray-200">
        <span className="text-sm font-medium text-gray-600">Text:</span>
        <button
          onClick={() => setTool('text')}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg border-2 transition ${
            tool === 'text'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white border-gray-300 hover:border-indigo-600 hover:bg-indigo-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="text-sm">Aa</span>
        </button>
      </div>

      {/* Color */}
      <div className="flex gap-2 items-center pr-5 border-r border-gray-200">
        <span className="text-sm font-medium text-gray-600">Color:</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          disabled={disabled}
          className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer disabled:opacity-50"
        />
      </div>

      {/* Size */}
      <div className="flex gap-2 items-center pr-5 border-r border-gray-200">
        <span className="text-sm font-medium text-gray-600">Size:</span>
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => setSize(parseInt(e.target.value))}
          disabled={disabled}
          className="w-32 disabled:opacity-50"
        />
        <span className="text-sm text-gray-600 w-8">{size}px</span>
      </div>

      {/* Fill */}
      <div className="flex gap-2 items-center pr-5 border-r border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={fill}
            onChange={(e) => setFill(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 disabled:opacity-50"
          />
          <span className="text-sm text-gray-700">Fill shapes</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={disabled}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶ Undo
        </button>
        <button
          onClick={onRedo}
          disabled={disabled}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↷ Redo
        </button>
        <button
          onClick={onClear}
          disabled={disabled}
          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  )
}