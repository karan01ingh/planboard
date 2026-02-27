import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import Toolbar from './Toolbar'
import Header from './Header'
import StatusBar from './StatusBar'
import AdminPanel from './AdminPanel'
import CursorOverlay from './CursorOverlay'

export default function Whiteboard({ board, user, onLogout }) {
  const canvasRef = useRef(null)
  const { socket, connected } = useSocket()
  // autoSaving
//   useEffect(() => {
//   if (!socket || !connected) return;

//   const interval = setInterval(() => {
//     if (!canvasRef.current) return;

//     const canvasData = canvasRef.current.toDataURL();
//     socket.emit("save-canvas", { canvasData });
//   }, 3000);

//   return () => clearInterval(interval);
// }, [socket, connected]);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(3)
  const [fill, setFill] = useState(false)
  const [history, setHistory] = useState([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [startPoint, setStartPoint] = useState(null)
  
  // Collaboration state
  const [activeUsers, setActiveUsers] = useState([])
  const [remoteCursors, setRemoteCursors] = useState(new Map())
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  
  const ctx = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    ctx.current = canvas.getContext('2d')
    ctx.current.lineCap = 'round'
    ctx.current.lineJoin = 'round'

    // Set canvas size
    const container = canvas.parentElement
    canvas.width = container.clientWidth - 40
    canvas.height = container.clientHeight - 40

    // Load existing canvas data
    if (board.canvasData) {
      const img = new Image()
      img.onload = () => {
        ctx.current.drawImage(img, 0, 0)
        setHistory([board.canvasData])
        setHistoryStep(0)
      }
      img.src = board.canvasData
    }
  }, [board.canvasData])

  // Socket.IO setup
useEffect(() => {
  if (!socket || !connected) return

  // Join the board
  socket.emit('join-board', {
    boardId: board.boardId,
    username: user.username,
    role: user.role,
    color: user.color
  })

  // ✅ RESTORE CANVAS AFTER REFRESH
  socket.on('joined-board', (data) => {
    if (data.canvasData && canvasRef.current && ctx.current) {
      const img = new Image()
      img.onload = () => {
        ctx.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        )
        ctx.current.drawImage(img, 0, 0)
      }
      img.src = data.canvasData
    }
  })

  // Listen for drawing events from others
  socket.on('draw', (data) => {
    handleRemoteDraw(data)
  })

  // Listen for canvas updates
  socket.on('canvas-updated', (data) => {
    if (data.canvasData && canvasRef.current && ctx.current) {
      const img = new Image()
      img.onload = () => {
        ctx.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        )
        ctx.current.drawImage(img, 0, 0)
      }
      img.src = data.canvasData
    }
  })

  // Listen for board clear
  socket.on('board-cleared', () => {
    if (!canvasRef.current || !ctx.current) return
    ctx.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    )
    setHistory([])
    setHistoryStep(-1)
  })

  socket.on('users-update', (users) => {
    setActiveUsers(users)
  })

  socket.on('cursor-update', (cursorData) => {
    setRemoteCursors(prev => {
      const newCursors = new Map(prev)
      newCursors.set(cursorData.socketId, cursorData)
      return newCursors
    })
  })

  socket.on('user-joined', (data) => {
    console.log(`${data.username} joined the board`)
  })

  socket.on('user-left', (data) => {
    console.log(`${data.username} left the board`)
    setRemoteCursors(prev => {
      const newCursors = new Map(prev)
      for (const [key, cursor] of newCursors.entries()) {
        if (cursor.username === data.username) {
          newCursors.delete(key)
        }
      }
      return newCursors
    })
  })

  const heartbeatInterval = setInterval(() => {
    socket.emit('heartbeat')
  }, 5000)

  return () => {
    clearInterval(heartbeatInterval)
    socket.off('joined-board')   // ✅ IMPORTANT
    socket.off('draw')
    socket.off('canvas-updated')
    socket.off('board-cleared')
    socket.off('users-update')
    socket.off('cursor-update')
    socket.off('user-joined')
    socket.off('user-left')
  }
}, [socket, connected, board.boardId, user])

  // Drawing handlers
  const startDrawing = (e) => {
    if (user.role === 'viewer') return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setStartPoint({ x, y })

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.current.beginPath()
      ctx.current.moveTo(x, y)
    }
  }

  const draw = (e) => {
    if (!isDrawing || user.role === 'viewer') return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const drawData = {
      tool,
      color,
      size,
      x,
      y,
      startX: startPoint.x,
      startY: startPoint.y
    }

    if (tool === 'pen') {
      drawLine(startPoint.x, startPoint.y, x, y, color, size)
      setStartPoint({ x, y })
      socket.emit('draw', drawData)
    } else if (tool === 'highlighter') {
      drawLine(startPoint.x, startPoint.y, x, y, color, size * 3, 0.3)
      setStartPoint({ x, y })
      socket.emit('draw', drawData)
    } else if (tool === 'eraser') {
      ctx.current.globalCompositeOperation = 'destination-out'
      drawLine(startPoint.x, startPoint.y, x, y, 'rgba(0,0,0,1)', size * 4)
      ctx.current.globalCompositeOperation = 'source-over'
      setStartPoint({ x, y })
      socket.emit('draw', drawData)
    }
  }

  const stopDrawing = (e) => {
    if (!isDrawing || user.role === 'viewer') return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'text') {
      const text = prompt('Enter text:')
      if (text) {
        ctx.current.font = `${size * 8}px Arial`
        ctx.current.fillStyle = color
        ctx.current.fillText(text, startPoint.x, startPoint.y)
        
        socket.emit('draw', {
          tool: 'text',
          color,
          size,
          x: startPoint.x,
          y: startPoint.y,
          text
        })
      }
    } else if (['rectangle', 'circle', 'triangle', 'diamond', 'star', 'hexagon', 'arrow', 'line'].includes(tool)) {
      drawShape(tool, startPoint.x, startPoint.y, x, y, color, size, fill)
      
      socket.emit('draw', {
        tool,
        color,
        size,
        fill,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: x,
        endY: y
      })
    }

    setIsDrawing(false)
    saveCanvas()
  }

  const drawLine = (x1, y1, x2, y2, strokeColor, strokeSize, alpha = 1) => {
    ctx.current.strokeStyle = strokeColor
    ctx.current.lineWidth = strokeSize
    ctx.current.globalAlpha = alpha
    ctx.current.lineTo(x2, y2)
    ctx.current.stroke()
    ctx.current.globalAlpha = 1
  }

  const drawShape = (shape, x1, y1, x2, y2, strokeColor, strokeSize, fillShape) => {
    ctx.current.strokeStyle = strokeColor
    ctx.current.fillStyle = strokeColor
    ctx.current.lineWidth = strokeSize

    switch (shape) {
      case 'rectangle':
        if (fillShape) {
          ctx.current.fillRect(x1, y1, x2 - x1, y2 - y1)
        } else {
          ctx.current.strokeRect(x1, y1, x2 - x1, y2 - y1)
        }
        break

      case 'circle': {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
        ctx.current.beginPath()
        ctx.current.arc(x1, y1, radius, 0, Math.PI * 2)
        fillShape ? ctx.current.fill() : ctx.current.stroke()
        break
      }

      case 'triangle': {
        const width = x2 - x1
        const height = y2 - y1
        ctx.current.beginPath()
        ctx.current.moveTo(x1 + width / 2, y1)
        ctx.current.lineTo(x2, y2)
        ctx.current.lineTo(x1, y2)
        ctx.current.closePath()
        fillShape ? ctx.current.fill() : ctx.current.stroke()
        break
      }

      case 'diamond': {
        const width = x2 - x1
        const height = y2 - y1
        ctx.current.beginPath()
        ctx.current.moveTo(x1 + width / 2, y1)
        ctx.current.lineTo(x2, y1 + height / 2)
        ctx.current.lineTo(x1 + width / 2, y2)
        ctx.current.lineTo(x1, y1 + height / 2)
        ctx.current.closePath()
        fillShape ? ctx.current.fill() : ctx.current.stroke()
        break
      }

      case 'star': {
        const centerX = (x1 + x2) / 2
        const centerY = (y1 + y2) / 2
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2
        const spikes = 5
        const innerRadius = radius / 2

        ctx.current.beginPath()
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (Math.PI / spikes) * i
          const r = i % 2 === 0 ? radius : innerRadius
          const x = centerX + Math.cos(angle - Math.PI / 2) * r
          const y = centerY + Math.sin(angle - Math.PI / 2) * r
          i === 0 ? ctx.current.moveTo(x, y) : ctx.current.lineTo(x, y)
        }
        ctx.current.closePath()
        fillShape ? ctx.current.fill() : ctx.current.stroke()
        break
      }

      case 'hexagon': {
        const centerX = (x1 + x2) / 2
        const centerY = (y1 + y2) / 2
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2

        ctx.current.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          i === 0 ? ctx.current.moveTo(x, y) : ctx.current.lineTo(x, y)
        }
        ctx.current.closePath()
        fillShape ? ctx.current.fill() : ctx.current.stroke()
        break
      }

      case 'line':
        ctx.current.beginPath()
        ctx.current.moveTo(x1, y1)
        ctx.current.lineTo(x2, y2)
        ctx.current.stroke()
        break

      case 'arrow': {
        const headLength = 20
        const angle = Math.atan2(y2 - y1, x2 - x1)

        ctx.current.beginPath()
        ctx.current.moveTo(x1, y1)
        ctx.current.lineTo(x2, y2)
        ctx.current.stroke()

        ctx.current.beginPath()
        ctx.current.moveTo(x2, y2)
        ctx.current.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6))
        ctx.current.moveTo(x2, y2)
        ctx.current.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6))
        ctx.current.stroke()
        break
      }
    }
  }

  const handleRemoteDraw = (data) => {
    if (data.tool === 'text') {
      ctx.current.font = `${data.size * 8}px Arial`
      ctx.current.fillStyle = data.color
      ctx.current.fillText(data.text, data.x, data.y)
    } else if (['rectangle', 'circle', 'triangle', 'diamond', 'star', 'hexagon', 'arrow', 'line'].includes(data.tool)) {
      drawShape(data.tool, data.startX, data.startY, data.endX, data.endY, data.color, data.size, data.fill)
    } else {
      // Free drawing
      drawLine(data.startX, data.startY, data.x, data.y, data.color, data.size, data.tool === 'highlighter' ? 0.3 : 1)
    }
  }

  const saveCanvas = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const dataURL = canvasRef.current.toDataURL()
      const newHistory = history.slice(0, historyStep + 1)
      newHistory.push(dataURL)
      setHistory(newHistory)
      setHistoryStep(newHistory.length - 1)

      socket.emit('save-canvas', { canvasData: dataURL })
    }, 500)
  }

  const undo = () => {
    if (user.role === 'viewer' || historyStep <= 0) return
    
    const newStep = historyStep - 1
    setHistoryStep(newStep)
    
    if (newStep >= 0 && history[newStep]) {
      const img = new Image()
      img.onload = () => {
        ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.current.drawImage(img, 0, 0)
      }
      img.src = history[newStep]
    } else {
      ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const redo = () => {
    if (user.role === 'viewer' || historyStep >= history.length - 1) return
    
    const newStep = historyStep + 1
    setHistoryStep(newStep)
    
    const img = new Image()
    img.onload = () => {
      ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.current.drawImage(img, 0, 0)
    }
    img.src = history[newStep]
  }

  const clearBoard = () => {
    if (user.role === 'viewer') return
    if (!window.confirm('Clear the entire board? This will affect all users.')) return

    ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHistory([])
    setHistoryStep(-1)
    socket.emit('clear-board')
  }

  const handleMouseMove = (e) => {
    if (!socket || user.role === 'viewer') return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    socket.emit('cursor-move', { x, y })

    if (isDrawing) {
      draw(e)
    }
  }

  const handleShare = () => {
    const shareText = `Join my PlanBoard!\n\nBoard Name: ${board.name}\n\nSteps:\n1. Open PlanBoard\n2. Enter the board name: "${board.name}"\n3. Choose your username and role\n4. Start collaborating!`
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Board invite copied to clipboard!')
      }).catch(() => {
        alert(shareText)
      })
    } else {
      alert(shareText)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header
        board={board}
        user={user}
        activeUsers={activeUsers}
        connected={connected}
        onShare={handleShare}
        onManage={() => setShowAdminPanel(!showAdminPanel)}
        onLogout={onLogout}
      />

      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        fill={fill}
        setFill={setFill}
        onUndo={undo}
        onRedo={redo}
        onClear={clearBoard}
        disabled={user.role === 'viewer'}
      />

      <div className="flex-1 flex items-center justify-center p-5 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          className={`bg-white rounded-lg shadow-lg ${user.role === 'viewer' ? 'cursor-default' : 'cursor-crosshair'}`}
        />
        <CursorOverlay cursors={remoteCursors} canvasRef={canvasRef} />
      </div>

      <StatusBar board={board} connected={connected} />

      {showAdminPanel && user.role === 'admin' && (
        <AdminPanel
          users={activeUsers}
          socket={socket}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  )
}