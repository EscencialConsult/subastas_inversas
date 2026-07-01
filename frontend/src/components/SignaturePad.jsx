import { useRef, useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

export function SignaturePad({ onConfirm, onCancel, title = 'Firmar Acta de Evaluación' }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const toast = useToast()

  function getCoordinates(e) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
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
    const ctx = canvas.getContext('2d')
    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
    const isCanvasBlank = !buffer.some(color => color !== 0)

    if (isCanvasBlank) {
      toast.error('Debe dibujar su firma antes de confirmar.')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    onConfirm(dataUrl)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const footer = (
    <>
      <Button variant="secondary" onClick={clearCanvas}>Limpiar</Button>
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      <Button onClick={handleSave}>Confirmar Firma</Button>
    </>
  )

  return (
    <Modal open title={title} onClose={onCancel} size="sm" footer={footer}>
      <p className="text-sm text-text-muted mb-4">
        Dibuje su firma con el mouse o pantalla táctil en el recuadro blanco:
      </p>
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full rounded-md border-2 border-dashed border-border cursor-crosshair"
        style={{ background: '#fff', touchAction: 'none' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </Modal>
  )
}
