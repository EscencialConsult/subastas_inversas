/**
 * Second pass: handle estado-vacio patterns and remaining badges.
 * Run: node scripts/migrate-f2-v2.js
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'

const SRC = join(import.meta.dirname, '..', 'src', 'features')

function findFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...findFiles(full))
    else if (extname(full) === '.jsx') files.push(full)
  }
  return files
}

function hasImport(content, component) {
  // Check various import patterns
  return content.includes(`import { ${component} }`) || content.includes(`import {${component}}`)
}

const EMPTY_MAPPINGS = [
  { file: 'ComprasRealizadasPage.jsx', icon: 'Package', title: 'Sin compras', desc: 'No hay compras realizadas todavía.' },
  { file: 'ProveedoresDirectorioPage.jsx', icon: 'Users', title: 'Sin proveedores', desc: 'No se encontraron proveedores.' },
  { file: 'TenantsListPage.jsx', icon: 'Building2', title: 'Sin empresas', desc: 'No hay empresas registradas.' },
  { file: 'AdjudicacionesListPage.jsx', icon: 'ClipboardList', title: 'Sin procesos', desc: 'No hay procesos para aprobación de adjudicación.' },
  { file: 'SubastasRealizadasPage.jsx', icon: 'Gavel', title: 'Sin subastas', desc: 'No hay subastas realizadas todavia.' },
]

const files = findFiles(SRC)
let changed = 0

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  const original = content
  const fname = file.split('\\').pop() || file.split('/').pop()

  // Replace estado-vacio patterns
  for (const m of EMPTY_MAPPINGS) {
    if (fname !== m.file) continue
    // Match <div className="estado-vacio">\n          <p>desc</p>\n        </div>
    const regex = new RegExp(
      `<div\\s+className=["']estado-vacio["'][^>]*>\\s*<p>(${escapeRegex(m.desc)})<\\/p>\\s*<\\/div>`,
      'g'
    )
    content = content.replace(regex, () => {
      return `<EmptyState icon={${m.icon}} title="${m.title}" description="${m.desc}" />`
    })
  }

  // Replace generic estado-vacio (try to extract text from p tag)
  content = content.replace(
    /<div\s+className="estado-vacio">\s*<p>([^<]+)<\/p>\s*<\/div>/g,
    (match, text) => `<Alert variant="info">${text}</Alert>`
  )

  // Replace state-vacio with span inside (AuditoriaListPage specific)
  content = content.replace(
    /<div\s+className="estado-vacio">\s*<p>([^<]+)<\/p>\s*<span[^>]*>.*?<\/span>\s*<\/div>/gs,
    (match, text) => `<Alert variant="info">${text}</Alert>`
  )

  // Replace remaining alerta patterns
  content = content.replace(
    /<div\s+className="alerta alerta--error mt-16">\{error\}<\/div>/g,
    '<Alert variant="error" className="mt-16">{error}</Alert>'
  )
  content = content.replace(
    /<div\s+className="alerta alerta--info mt-16">\{confirmacion\}<\/div>/g,
    '<Alert variant="info" className="mt-16">{confirmacion}</Alert>'
  )

  // Replace alerta--error mt-16
  content = content.replace(
    /<div\s+className="alerta alerta--error mt-16">([^<]+)<\/div>/g,
    '<Alert variant="error" className="mt-16">$1</Alert>'
  )
  content = content.replace(
    /<div\s+className="alerta alerta--info mt-16">([^<]+)<\/div>/g,
    '<Alert variant="info" className="mt-16">$1</Alert>'
  )

  // Add imports if changed
  if (content !== original) {
    if (content.includes('<EmptyState') && !hasImport(content, 'EmptyState')) {
      content = addImport(content, 'EmptyState', '../../components/ui/EmptyState.jsx')
    }
    if (content.includes('<Alert') && !hasImport(content, 'Alert') && !content.includes('from \'../../components/ui/Alert.jsx\'') && !content.includes('from "../../components/ui/Alert.jsx"')) {
      content = addImport(content, 'Alert', '../../components/ui/Alert.jsx')
    }
    writeFileSync(file, content, 'utf-8')
    changed++
    console.log(`  Modified: ${file}`)
  }
}

console.log(`\n${changed} files modified`)

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function addImport(content, component, source) {
  const lines = content.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimStart()
    if (line.startsWith('import ') && !line.includes('{') && !line.endsWith('{')) {
      lastImportIdx = i
    } else if (line.startsWith('import ') && line.includes('}')) {
      lastImportIdx = i
    }
  }
  if (lastImportIdx >= 0) {
    const indent = lines[lastImportIdx].match(/^\s*/)[0]
    lines.splice(lastImportIdx + 1, 0, `${indent}import { ${component} } from '${source}'`)
  }
  return lines.join('\n')
}
