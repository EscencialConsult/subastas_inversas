import { useRef, useState, useEffect } from 'react'

export function SignaturePad({ onConfirm, onCancel, title = 'Firmar Acta de Evaluación' }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Start drawing
  function getCoordinates(e) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    // Support touch events
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    
    // Support mouse events
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function startDrawing(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const coords = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    setIsDrawing(true)
  }

  function draw(e) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const coords = getCoordinates(e)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  function stopDrawing() {
    setIsDrawing(false)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Check if canvas is empty before saving
    const ctx = canvas.getContext('2d')
    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
    const isCanvasBlank = !buffer.some(color => color !== 0)

    if (isCanvasBlank) {
      alert('Debe dibujar su firma antes de confirmar.')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    onConfirm(dataUrl)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#0f172a' // slate-900 color for signature line
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '450px' }}>
        <div className="modal__header">
          <h2>{title}</h2>
          <p className="form__seccion-ayuda" style={{ marginTop: '5px' }}>
            Dibuje su firma con el mouse o pantalla táctil en el recuadro blanco:
          </p>
        </div>
        
        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            style={{
              background: '#fff',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              cursor: 'crosshair',
              touchAction: 'none', // Prevents scrolling while signing on mobile
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="modal__footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn--secundario" onClick={clearCanvas}>
            Limpiar
          </button>
          <button className="btn btn--texto" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn--primario" onClick={handleSave}>
            Confirmar Firma
          </button>
        </div>
      </div>
    </div>
  )
}
