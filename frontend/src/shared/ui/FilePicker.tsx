import { forwardRef, useRef, useState, DragEvent, ChangeEvent, InputHTMLAttributes } from 'react'
import { UploadCloud, File, Trash } from 'lucide-react'
import { FormField } from './FormField'
import { Button } from './Button'

export interface FilePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  help?: string
  required?: boolean
  fieldClassName?: string
  onChange?: (files: File | File[] | null) => void
}

export const FilePicker = forwardRef<HTMLInputElement, FilePickerProps>(function FilePicker(
  {
    label,
    error,
    help,
    required = false,
    disabled = false,
    accept,
    multiple = false,
    onChange,
    className = '',
    fieldClassName = '',
    id,
    ...props
  },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      updateFiles(files)
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files)
      updateFiles(files)
    }
  }

  const updateFiles = (files: File[]) => {
    const updated = multiple ? [...selectedFiles, ...files] : [files[0]]
    setSelectedFiles(updated)
    if (onChange) {
      onChange(multiple ? updated : updated[0])
    }
  }

  const removeFile = (index: number) => {
    if (disabled) return
    const updated = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updated)
    if (onChange) {
      onChange(multiple ? updated : updated[0] || null)
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <FormField label={label} error={error} help={help} required={required} htmlFor={id} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }: { id: string; describedBy: string; invalid: boolean }) => (
        <div className={`w-full flex flex-col gap-3 ${className}`}>
          {/* Drag & Drop Area */}
          <div className="relative">
            <input
              id={fieldId}
              ref={(e) => {
                fileInputRef.current = e
                if (typeof ref === 'function') ref(e)
                else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = e
              }}
              type="file"
              className="sr-only"
              accept={accept}
              multiple={multiple}
              disabled={disabled}
              onChange={handleFileInput}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...props}
            />

            <div
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
                ${dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-surface'}
                ${disabled ? 'opacity-50 cursor-default bg-background' : 'hover:border-primary/60 hover:bg-slate-50/50'}
                ${invalid ? 'border-error bg-error-bg/10' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={!disabled ? onButtonClick : undefined}
            >
              <UploadCloud className={`w-10 h-10 mb-2 ${invalid ? 'text-error' : dragActive ? 'text-primary' : 'text-text-muted'}`} />

              <p className="text-sm font-semibold text-text">
                {multiple ? 'Arrastra tus archivos aquí o haz clic para subir' : 'Arrastra tu archivo aquí o haz clic para subir'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {accept ? `Archivos permitidos: ${accept.split(',').join(', ')}` : 'Cualquier tipo de archivo'}
              </p>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <ul className="flex flex-col gap-2 m-0 p-0 list-none">
              {selectedFiles.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface text-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File className="w-5 h-5 text-text-muted flex-shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-text truncate">{file.name}</span>
                      <span className="text-xs text-text-muted">{formatFileSize(file.size)}</span>
                    </div>
                  </div>

                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash className="w-4 h-4" />}
                      aria-label="Eliminar archivo"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(idx)
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </FormField>
  )
})
