/**
 * Arbol backend — Google Apps Script bound to the family spreadsheet.
 *
 * Tabs (created by menu "Árbol → Preparar hojas"):
 *   Miembros  — one row per person (the tree data)
 *   Códigos   — per-person edit codes; uncheck "Activo" to revoke one
 *   Historial — every field change; tick "Revertir" to undo it
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me    Who has access: Anyone
 * The spreadsheet itself can (and should) stay private: the web app runs as you.
 */

const SHEET_MEMBERS = 'Miembros'
const SHEET_CODES   = 'Códigos'
const SHEET_HISTORY = 'Historial'

// Drive folder where photos uploaded from the site are stored
const PHOTOS_FOLDER_ID = '1XFwkvzmbM81ZyIDitFeZqGhFg3tvFiqk'
const MAX_PHOTO_BYTES  = 8 * 1024 * 1024

// API field ↔ "Miembros" column header. ID is not editable.
const FIELDS = {
  id:         'ID',
  firstName:  'Primer Nombre',
  middleName: 'Segundo Nombre',
  lastName:   'Apellido',
  fatherId:   'Padre ID',
  motherId:   'Madre ID',
  born:       'Nacimiento',
  died:       'Fallecimiento',
  bio:        'Bio',
  photo:      'Foto',
}
const EDITABLE = Object.keys(FIELDS).filter(k => k !== 'id')

const CODE_HEADERS    = ['Código', 'Persona', 'Activo', 'Creado', 'Último uso']
const HISTORY_HEADERS = ['Fecha', 'Editor', 'Código', 'Miembro ID', 'Campo', 'Valor anterior', 'Valor nuevo', 'Revertir', 'Estado']

// ── HTTP entry points ────────────────────────────────────────────────────────

function doGet() {
  return json({ ok: true, members: readMembers() })
}

function doPost(e) {
  // An uncaught error makes Google answer with an HTML page without CORS headers, which the
  // browser only reports as a CORS failure; always answer JSON with the real message instead
  try {
    return handlePost(e)
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'server_error', message: String(err && err.message || err) })
  }
}

function handlePost(e) {
  let req
  try {
    req = JSON.parse(e.postData.contents)
  } catch (err) {
    return json({ ok: false, error: 'bad_request' })
  }

  const editor = checkCode(req.code)
  if (!editor) return json({ ok: false, error: 'invalid_code' })

  if (req.action === 'verify') return json({ ok: true, editor: editor.name })
  if (req.action === 'update') return json(updateMember(editor, req.id, req.changes || {}))
  if (req.action === 'upload') return json(savePhoto(editor, req.id, req.mimeType, req.data))
  return json({ ok: false, error: 'unknown_action' })
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

// ── Members ──────────────────────────────────────────────────────────────────

function readMembers() {
  const { rows, col } = table(SHEET_MEMBERS)
  return rows
    .filter(r => String(r[col[FIELDS.id]] || '').trim())
    .map(r => rowToMember(r, col))
}

function rowToMember(r, col) {
  const m = {}
  for (const [key, header] of Object.entries(FIELDS)) {
    m[key] = col[header] === undefined ? '' : cellText(r[col[header]])
  }
  return m
}

function updateMember(editor, id, changes) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const sheet = book().getSheetByName(SHEET_MEMBERS)
    const { rows, col } = table(SHEET_MEMBERS)
    const idx = rows.findIndex(r => cellText(r[col[FIELDS.id]]) === id)
    if (idx === -1) return { ok: false, error: 'not_found' }

    const row = rows[idx]
    const now = new Date()
    const history = []
    for (const key of EDITABLE) {
      if (!(key in changes)) continue
      const header = FIELDS[key]
      if (col[header] === undefined) continue
      const before = cellText(row[col[header]])
      const after  = String(changes[key] == null ? '' : changes[key]).trim()
      if (before === after) continue
      // Prefix with ' so Sheets keeps "02/04" etc. as typed text instead of a date
      sheet.getRange(idx + 2, col[header] + 1).setValue(after ? "'" + after : '')
      row[col[header]] = after
      history.push([now, editor.name, editor.code, id, header, before, after, false, ''])
    }

    if (history.length) {
      const h = ensureSheet(SHEET_HISTORY, HISTORY_HEADERS)
      const start = h.getLastRow() + 1
      h.getRange(start, 1, history.length, HISTORY_HEADERS.length).setValues(history)
      h.getRange(start, HISTORY_HEADERS.indexOf('Revertir') + 1, history.length, 1).insertCheckboxes()
    }
    return { ok: true, member: rowToMember(row, col), changed: history.length }
  } finally {
    lock.releaseLock()
  }
}

// ── Photos ───────────────────────────────────────────────────────────────────

// Stores the image and returns its share link. The member's "Foto" is only changed
// when the client then saves it through "update", so it shows up in Historial.
// Earlier photos stay in the folder, so reverting keeps working.
function savePhoto(editor, id, mimeType, data) {
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType || '') || !data) return { ok: false, error: 'bad_image' }
  const bytes = Utilities.base64Decode(data)
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: 'too_large' }

  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss')
  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
  const name = (id || 'foto') + '-' + stamp + '.' + ext
  const file = DriveApp.getFolderById(PHOTOS_FOLDER_ID).createFile(Utilities.newBlob(bytes, mimeType, name))
  file.setDescription('Subida por ' + editor.name)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return { ok: true, link: 'https://drive.google.com/file/d/' + file.getId() + '/view' }
}

// Run once from the editor (▶ Run → probarFotos): grants Drive permission and checks the folder
function probarFotos() {
  const folder = DriveApp.getFolderById(PHOTOS_FOLDER_ID)
  const file = folder.createFile('prueba.txt', 'ok')
  file.setTrashed(true)
  console.log('OK: la carpeta "' + folder.getName() + '" funciona')
}

// ── Codes ────────────────────────────────────────────────────────────────────

const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

function checkCode(code) {
  const wanted = normCode(code)
  if (!wanted) return null
  const sheet = book().getSheetByName(SHEET_CODES)
  if (!sheet) return null
  const { rows, col } = table(SHEET_CODES)
  const idx = rows.findIndex(r => normCode(r[col['Código']]) === wanted)
  if (idx === -1) return null
  const r = rows[idx]
  if (r[col['Activo']] !== true) return null
  sheet.getRange(idx + 2, col['Último uso'] + 1).setValue(new Date())
  return { code: cellText(r[col['Código']]), name: cellText(r[col['Persona']]) }
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
  let s = ''
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s.slice(0, 4) + '-' + s.slice(4)
}

// ── Sheet menu ───────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Árbol')
    .addItem('Nuevo código de edición…', 'menuNewCode')
    .addItem('Preparar hojas', 'menuSetup')
    .addToUi()
}

function menuSetup() {
  ensureSheet(SHEET_MEMBERS, Object.values(FIELDS))
  ensureSheet(SHEET_CODES, CODE_HEADERS)
  ensureSheet(SHEET_HISTORY, HISTORY_HEADERS)
  SpreadsheetApp.getUi().alert('Hojas listas: ' + [SHEET_MEMBERS, SHEET_CODES, SHEET_HISTORY].join(', '))
}

function menuNewCode() {
  const ui = SpreadsheetApp.getUi()
  const res = ui.prompt('Nuevo código', '¿Para quién es el código?', ui.ButtonSet.OK_CANCEL)
  if (res.getSelectedButton() !== ui.Button.OK || !res.getResponseText().trim()) return
  const sheet = ensureSheet(SHEET_CODES, CODE_HEADERS)
  const code = generateCode()
  sheet.appendRow([code, res.getResponseText().trim(), true, new Date(), ''])
  sheet.getRange(sheet.getLastRow(), CODE_HEADERS.indexOf('Activo') + 1).insertCheckboxes().check()
  ui.alert('Código para ' + res.getResponseText().trim() + ':\n\n' + code + '\n\nPara revocarlo, desmarcá "Activo" en la hoja Códigos.')
}

// ── Revert: tick "Revertir" in Historial ─────────────────────────────────────

function onEdit(e) {
  const sheet = e.range.getSheet()
  if (sheet.getName() !== SHEET_HISTORY) return
  const revertCol = HISTORY_HEADERS.indexOf('Revertir') + 1
  if (e.range.getColumn() !== revertCol || e.range.getRow() < 2 || e.value !== 'TRUE') return

  const rowNum = e.range.getRow()
  const statusCell = sheet.getRange(rowNum, HISTORY_HEADERS.indexOf('Estado') + 1)
  if (String(statusCell.getValue()).startsWith('Revertido')) return

  const h = Object.fromEntries(HISTORY_HEADERS.map((name, i) => [name, i]))
  const entry = sheet.getRange(rowNum, 1, 1, HISTORY_HEADERS.length).getValues()[0]
  const memberId = cellText(entry[h['Miembro ID']])
  const header   = cellText(entry[h['Campo']])
  const before   = cellText(entry[h['Valor anterior']])
  const after    = cellText(entry[h['Valor nuevo']])

  const members = book().getSheetByName(SHEET_MEMBERS)
  const { rows, col } = table(SHEET_MEMBERS)
  const idx = rows.findIndex(r => cellText(r[col[FIELDS.id]]) === memberId)
  if (idx === -1 || col[header] === undefined) {
    statusCell.setValue('Error: miembro o campo no encontrado')
    e.range.uncheck()
    return
  }

  const cell = members.getRange(idx + 2, col[header] + 1)
  const current = cellText(rows[idx][col[header]])
  if (current !== after) {
    // A later edit changed this field again; don't clobber it silently
    statusCell.setValue('Conflicto: el valor actual es "' + current + '". Revertí los cambios posteriores primero.')
    e.range.uncheck()
    return
  }
  cell.setValue(before ? "'" + before : '')
  statusCell.setValue('Revertido ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function book() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

function table(name) {
  const sheet = book().getSheetByName(name)
  if (!sheet) throw new Error('Falta la hoja "' + name + '"')
  const values = sheet.getDataRange().getValues()
  const headers = (values.shift() || []).map(v => String(v).trim())
  const col = Object.fromEntries(headers.map((hd, i) => [hd, i]))
  return { rows: values, col }
}

function ensureSheet(name, headers) {
  const sheet = book().getSheetByName(name) || book().insertSheet(name)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
  }
  return sheet
}

function cellText(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy')
  return String(v == null ? '' : v).trim()
}
