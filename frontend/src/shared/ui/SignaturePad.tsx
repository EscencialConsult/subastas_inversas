import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, TouchEvent } from 'react'
import { useToast } from '../../context/ToastContext'
import { Button } from './Button'
import { Modal } from './Modal'

type SignatureEvent = MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>

interface SignaturePadProps {
  onConfirm: (signatureBase64: string) => void
  onCancel: () => void
  title?: string
}

export function SignaturePad({ onConfirm, onCancel, title = 'Firmar Acta de Evaluacion' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const toast = useToast()

  function getCoordinates(event: SignatureEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in event && event.touches[0]) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      }
    }

    const mouseEvent = event as MouseEvent<HTMLCanvasElement>
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top,
    }
  }

  function startDrawing(event: SignatureEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCoordinates(event)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    setIsDrawing(true)
  }

  function draw(event: SignatureEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCoordinates(event)
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
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
    const isCanvasBlank = !buffer.some((color) => color !== 0)

    if (isCanvasBlank) {
      toast.error('Debe dibujar su firma antes de confirmar.')
      return
    }

    onConfirm(canvas.toDataURL('image/png'))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
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
      <p className="mb-4 text-sm text-text-muted">
        Dibuje su firma con el mouse o pantalla tactil en el recuadro blanco:
      </p>
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full cursor-crosshair rounded-md border-2 border-dashed border-border"
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
