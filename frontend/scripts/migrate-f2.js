/**
 * Script de migración Fase 2: reemplaza patrones legacy por componentes UI.
 * Ejecutar: node scripts/migrate-f2.js
 *
 * Patrones:
 * 1. className="alerta alerta--{variant}" → <Alert variant={mapped}>
 * 2. className="badge badge--{variant}" → <Badge variant={mapped}>
 * 3. className="estado-cargando" → spinner wrapper
 * 4. className="estado-vacio" → EmptyState
 * 5. <label className="campo"> → <Input>/<Select>/<Textarea>/<Checkbox>
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'

const SRC = join(import.meta.dirname, '..', 'src', 'features')

const ALERT_MAP = {
  'alerta--error': 'error',
  'alerta--ok': 'success',
  'alerta--info': 'info',
  'alerta--warning': 'warning',
  'alerta--advertencia': 'warning',
}

const BADGE_MAP = {
  'badge--ok': 'success',
  'badge--error': 'error',
  'badge--info': 'info',
  'badge--warn': 'warning',
  'badge--off': 'neutral',
}

// Find all .jsx files recursively
function findFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...findFiles(full))
    else if (extname(full) === '.jsx') files.push(full)
  }
  return files
}

function hasImport(content, component, source) {
  return content.includes(`import { ${component} } from '${source}'`)
    || content.includes(`import {${component}} from '${source}'`)
}

function addImport(content, component, source) {
  // Find last import line
  const lines = content.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ')) {
      lastImportIdx = i
    }
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, `import { ${component} } from '${source}'`)
  }
  return lines.join('\n')
}

function replaceAlerts(content) {
  let changed = false

  // Pattern 1: <div className="alerta alerta--{variant}">...</div>
  // Match: <div className="alerta alerta--xxx" ...optionalStyle...> content </div>
  for (const [cls, variant] of Object.entries(ALERT_MAP)) {
    const regex = new RegExp(
      `<div\\s+className=["']alerta\\s+${cls}["']([^>]*)>([\\s\\S]*?)<\\/div>`,
      'g'
    )
    content = content.replace(regex, (match, attrs, inner) => {
      changed = true
      // Extract style if present and convert to className
      const styleMatch = attrs.match(/style=\{([^}]+)\}/)
      let extraClass = ''
      if (styleMatch) {
        const style = styleMatch[1]
        if (style.includes('marginTop')) extraClass = ' mt-4'
        if (style.includes('margin')) extraClass = ' mt-4'
        if (style.includes('gridColumn')) extraClass = ' mt-4'
      }
      return `<Alert variant="${variant}"${extraClass ? ` className="${extraClass.trim()}"` : ''}>${inner.trim()}</Alert>`
    })
  }

  if (changed && !hasImport(content, 'Alert', '../../components/ui/Alert.jsx') && !hasImport(content, 'Alert', '../../../components/ui/Alert.jsx')) {
    // Calculate relative path
    content = addImport(content, 'Alert', '../../components/ui/Alert.jsx')
  }

  return content
}

function replaceBadges(content) {
  let changed = false

  // Pattern: <span className="badge badge--{variant}">content</span>
  // Also: <span className={"badge " + ...}>content</span> — skip dynamic
  for (const [cls, variant] of Object.entries(BADGE_MAP)) {
    // Simple string className
    const regex = new RegExp(
      `<span\\s+className=["']badge\\s+${cls}["'][^>]*>([\\s\\S]*?)<\\/span>`,
      'g'
    )
    content = content.replace(regex, (match, inner) => {
      changed = true
      // Check for inline styles
      const styleMatch = match.match(/style=\{([^}]+)\}/)
      let extraProps = ''
      if (styleMatch) {
        const style = styleMatch[1]
        if (style.includes('fontSize') || style.includes('padding') || style.includes('fontWeight')) {
          extraProps = ` className="text-[10px] px-1.5 py-0 font-bold"`
        }
      }
      const titleMatch = match.match(/title="([^"]*)"/)
      if (titleMatch) {
        extraProps += ` title="${titleMatch[1]}"`
      }
      return `<Badge variant="${variant}"${extraProps}>${inner.trim()}</Badge>`
    })
  }

  if (changed) {
    const relPath = content.includes("from '../../") ? '../../components/ui/Badge.jsx' : '../../../components/ui/Badge.jsx'
    if (!hasImport(content, 'Badge', relPath) && !hasImport(content, 'Badge', '../../components/ui/Badge.jsx') && !hasImport(content, 'Badge', '../../../components/ui/Badge.jsx')) {
      // Find existing Badge import with different path
      if (!content.includes("from '") && !content.includes('from "')) {
        const altPath = content.includes("from '../../") ? '../../components/ui/Badge.jsx' : '../../../components/ui/Badge.jsx'
        content = addImport(content, 'Badge', altPath)
      } else {
        content = addImport(content, 'Badge', '../../components/ui/Badge.jsx')
      }
    }
  }

  return content
}

function replaceEstadoCargando(content) {
  if (!content.includes('estado-cargando')) return content

  // Pattern: <p className="estado-cargando">Cargando...</p>
  // → <div className="flex justify-center py-12"><Spinner /></div>
  let changed = false

  const regex = /<p\s+className=["']estado-cargando["'][^>]*>([\s\S]*?)<\/p>/g
  content = content.replace(regex, () => {
    changed = true
    return '<div className="flex justify-center py-12"><Spinner /></div>'
  })

  if (changed) {
    content = addImportIfMissing(content, 'Spinner', '../../components/ui/Spinner.jsx')
  }

  return content
}

function addImportIfMissing(content, component, source) {
  const variants = [`../../components/ui/${component}.jsx`, `../../../components/ui/${component}.jsx`]
  for (const v of variants) {
    if (hasImport(content, component, v)) return content
  }
  return addImport(content, component, source)
}

const files = findFiles(SRC)
console.log(`Found ${files.length} .jsx files`)

let alertFiles = 0
let badgeFiles = 0
let spinnerFiles = 0

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  const original = content

  content = replaceAlerts(content)
  content = replaceBadges(content)
  content = replaceEstadoCargando(content)

  if (content !== original) {
    writeFileSync(file, content, 'utf-8')
    if (content !== original) {
      if (content.includes('<Alert')) alertFiles++
      if (content.includes('<Badge')) badgeFiles++
      if (content.includes('<Spinner')) spinnerFiles++
    }
  }
}

console.log(`Alert replacements: ${alertFiles} files changed`)
console.log(`Badge replacements: ${badgeFiles} files changed`)
console.log(`Spinner replacements: ${spinnerFiles} files changed`)
console.log('Done')
