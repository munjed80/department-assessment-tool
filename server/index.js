const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const app = express()
const PORT = process.env.PORT || 4000
const HIGH_PRIORITY_THRESHOLD = 60
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'))

app.use(cors())
app.use(express.json())

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err)
        return
      }
      resolve({ id: this.lastID, changes: this.changes })
    })
  })

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err)
        return
      }
      resolve(row)
    })
  })

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
        return
      }
      resolve(rows)
    })
  })

const toCsv = (rows) => {
  if (!rows.length) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const escapeCsv = (value) => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [headers.join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','))
  })

  return `${lines.join('\n')}\n`
}

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : fallback
}

const initDb = async () => {
  await run('PRAGMA foreign_keys = ON')

  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      head_name TEXT,
      phone TEXT,
      employees_count INTEGER DEFAULT 0,
      official_responsibilities TEXT,
      current_tools TEXT,
      digital_readiness_score REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      interview_date TEXT,
      interviewed_person TEXT,
      position TEXT,
      current_workflow_summary TEXT,
      main_routines TEXT,
      main_problems TEXT,
      cooperation_score REAL DEFAULT 0,
      resistance_score REAL DEFAULT 0,
      notes TEXT,
      next_steps TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      root_cause TEXT,
      impact_type TEXT,
      severity_score REAL DEFAULT 0,
      frequency_score REAL DEFAULT 0,
      urgency_score REAL DEFAULT 0,
      priority_score REAL GENERATED ALWAYS AS (severity_score * frequency_score * urgency_score) STORED,
      suggested_solution TEXT,
      estimated_cost REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `)
}

const normalizeDepartment = (body) => ({
  name: body.name?.trim(),
  head_name: body.head_name || '',
  phone: body.phone || '',
  employees_count: parseInteger(body.employees_count, 0),
  official_responsibilities: body.official_responsibilities || '',
  current_tools: body.current_tools || '',
  digital_readiness_score: parseNumber(body.digital_readiness_score),
  notes: body.notes || '',
})

const normalizeInterview = (body) => ({
  department_id: parseInteger(body.department_id, 0),
  interview_date: body.interview_date || '',
  interviewed_person: body.interviewed_person || '',
  position: body.position || '',
  current_workflow_summary: body.current_workflow_summary || '',
  main_routines: body.main_routines || '',
  main_problems: body.main_problems || '',
  cooperation_score: parseNumber(body.cooperation_score),
  resistance_score: parseNumber(body.resistance_score),
  notes: body.notes || '',
  next_steps: body.next_steps || '',
})

const normalizeProblem = (body) => ({
  department_id: parseInteger(body.department_id, 0),
  title: body.title?.trim(),
  description: body.description || '',
  root_cause: body.root_cause || '',
  impact_type: body.impact_type || '',
  severity_score: parseNumber(body.severity_score),
  frequency_score: parseNumber(body.frequency_score),
  urgency_score: parseNumber(body.urgency_score),
  suggested_solution: body.suggested_solution || '',
  estimated_cost: parseNumber(body.estimated_cost),
  status: body.status || 'open',
  notes: body.notes || '',
})

app.get('/api/departments', async (_req, res) => {
  const rows = await all('SELECT * FROM departments ORDER BY created_at DESC')
  res.json(rows)
})

app.post('/api/departments', async (req, res) => {
  const item = normalizeDepartment(req.body)
  if (!item.name) {
    res.status(400).json({ error: 'Department name is required' })
    return
  }

  const result = await run(
    `INSERT INTO departments (name, head_name, phone, employees_count, official_responsibilities, current_tools, digital_readiness_score, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.name,
      item.head_name,
      item.phone,
      item.employees_count,
      item.official_responsibilities,
      item.current_tools,
      item.digital_readiness_score,
      item.notes,
    ],
  )

  const created = await get('SELECT * FROM departments WHERE id = ?', [result.id])
  res.status(201).json(created)
})

app.put('/api/departments/:id', async (req, res) => {
  const item = normalizeDepartment(req.body)
  if (!item.name) {
    res.status(400).json({ error: 'Department name is required' })
    return
  }

  const result = await run(
    `UPDATE departments
     SET name = ?, head_name = ?, phone = ?, employees_count = ?, official_responsibilities = ?, current_tools = ?, digital_readiness_score = ?, notes = ?
     WHERE id = ?`,
    [
      item.name,
      item.head_name,
      item.phone,
      item.employees_count,
      item.official_responsibilities,
      item.current_tools,
      item.digital_readiness_score,
      item.notes,
      req.params.id,
    ],
  )

  if (!result.changes) {
    res.status(404).json({ error: 'Department not found' })
    return
  }

  const updated = await get('SELECT * FROM departments WHERE id = ?', [req.params.id])
  res.json(updated)
})

app.delete('/api/departments/:id', async (req, res) => {
  const result = await run('DELETE FROM departments WHERE id = ?', [req.params.id])
  if (!result.changes) {
    res.status(404).json({ error: 'Department not found' })
    return
  }

  res.status(204).end()
})

app.get('/api/interviews', async (_req, res) => {
  const rows = await all(
    `SELECT interviews.*, departments.name AS department_name
     FROM interviews
     JOIN departments ON departments.id = interviews.department_id
     ORDER BY interviews.created_at DESC`,
  )
  res.json(rows)
})

app.post('/api/interviews', async (req, res) => {
  const item = normalizeInterview(req.body)
  if (!item.department_id) {
    res.status(400).json({ error: 'Department is required' })
    return
  }

  const result = await run(
    `INSERT INTO interviews (
      department_id, interview_date, interviewed_person, position, current_workflow_summary,
      main_routines, main_problems, cooperation_score, resistance_score, notes, next_steps
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.department_id,
      item.interview_date,
      item.interviewed_person,
      item.position,
      item.current_workflow_summary,
      item.main_routines,
      item.main_problems,
      item.cooperation_score,
      item.resistance_score,
      item.notes,
      item.next_steps,
    ],
  )

  const created = await get('SELECT * FROM interviews WHERE id = ?', [result.id])
  res.status(201).json(created)
})

app.put('/api/interviews/:id', async (req, res) => {
  const item = normalizeInterview(req.body)
  if (!item.department_id) {
    res.status(400).json({ error: 'Department is required' })
    return
  }

  const result = await run(
    `UPDATE interviews SET
      department_id = ?, interview_date = ?, interviewed_person = ?, position = ?, current_workflow_summary = ?,
      main_routines = ?, main_problems = ?, cooperation_score = ?, resistance_score = ?, notes = ?, next_steps = ?
     WHERE id = ?`,
    [
      item.department_id,
      item.interview_date,
      item.interviewed_person,
      item.position,
      item.current_workflow_summary,
      item.main_routines,
      item.main_problems,
      item.cooperation_score,
      item.resistance_score,
      item.notes,
      item.next_steps,
      req.params.id,
    ],
  )

  if (!result.changes) {
    res.status(404).json({ error: 'Interview not found' })
    return
  }

  const updated = await get('SELECT * FROM interviews WHERE id = ?', [req.params.id])
  res.json(updated)
})

app.delete('/api/interviews/:id', async (req, res) => {
  const result = await run('DELETE FROM interviews WHERE id = ?', [req.params.id])
  if (!result.changes) {
    res.status(404).json({ error: 'Interview not found' })
    return
  }

  res.status(204).end()
})

app.get('/api/problems', async (_req, res) => {
  const rows = await all(
    `SELECT problems.*, departments.name AS department_name
     FROM problems
     JOIN departments ON departments.id = problems.department_id
     ORDER BY problems.priority_score DESC, problems.created_at DESC`,
  )
  res.json(rows)
})

app.post('/api/problems', async (req, res) => {
  const item = normalizeProblem(req.body)
  if (!item.department_id || !item.title) {
    res.status(400).json({ error: 'Department and title are required' })
    return
  }

  const result = await run(
    `INSERT INTO problems (
      department_id, title, description, root_cause, impact_type,
      severity_score, frequency_score, urgency_score,
      suggested_solution, estimated_cost, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.department_id,
      item.title,
      item.description,
      item.root_cause,
      item.impact_type,
      item.severity_score,
      item.frequency_score,
      item.urgency_score,
      item.suggested_solution,
      item.estimated_cost,
      item.status,
      item.notes,
    ],
  )

  const created = await get('SELECT * FROM problems WHERE id = ?', [result.id])
  res.status(201).json(created)
})

app.put('/api/problems/:id', async (req, res) => {
  const item = normalizeProblem(req.body)
  if (!item.department_id || !item.title) {
    res.status(400).json({ error: 'Department and title are required' })
    return
  }

  const result = await run(
    `UPDATE problems SET
      department_id = ?, title = ?, description = ?, root_cause = ?, impact_type = ?,
      severity_score = ?, frequency_score = ?, urgency_score = ?,
      suggested_solution = ?, estimated_cost = ?, status = ?, notes = ?
     WHERE id = ?`,
    [
      item.department_id,
      item.title,
      item.description,
      item.root_cause,
      item.impact_type,
      item.severity_score,
      item.frequency_score,
      item.urgency_score,
      item.suggested_solution,
      item.estimated_cost,
      item.status,
      item.notes,
      req.params.id,
    ],
  )

  if (!result.changes) {
    res.status(404).json({ error: 'Problem not found' })
    return
  }

  const updated = await get('SELECT * FROM problems WHERE id = ?', [req.params.id])
  res.json(updated)
})

app.delete('/api/problems/:id', async (req, res) => {
  const result = await run('DELETE FROM problems WHERE id = ?', [req.params.id])
  if (!result.changes) {
    res.status(404).json({ error: 'Problem not found' })
    return
  }

  res.status(204).end()
})

app.get('/api/dashboard', async (_req, res) => {
  const [departmentCount, interviewCount, problemCount, highPriorityCount, topProblems] =
    await Promise.all([
      get('SELECT COUNT(*) AS count FROM departments'),
      get('SELECT COUNT(*) AS count FROM interviews'),
      get('SELECT COUNT(*) AS count FROM problems'),
      get('SELECT COUNT(*) AS count FROM problems WHERE priority_score >= ?', [HIGH_PRIORITY_THRESHOLD]),
      all(
        `SELECT problems.id, problems.title, problems.priority_score, departments.name AS department_name
         FROM problems
         JOIN departments ON departments.id = problems.department_id
         ORDER BY problems.priority_score DESC
         LIMIT 5`,
      ),
    ])

  res.json({
    totalDepartments: departmentCount.count,
    totalInterviews: interviewCount.count,
    totalProblems: problemCount.count,
    highPriorityProblems: highPriorityCount.count,
    topProblems,
  })
})

app.get('/api/reports', async (req, res) => {
  const departmentId = req.query.department_id ? parseInteger(req.query.department_id, 0) : null
  const minPriority = parseNumber(req.query.min_priority, 0)

  const problemFilters = ['problems.priority_score >= ?']
  const problemParams = [minPriority]

  if (departmentId) {
    problemFilters.push('problems.department_id = ?')
    problemParams.push(departmentId)
  }

  const interviewFilters = []
  const interviewParams = []
  if (departmentId) {
    interviewFilters.push('interviews.department_id = ?')
    interviewParams.push(departmentId)
  }

  const problems = await all(
    `SELECT problems.*, departments.name AS department_name
     FROM problems
     JOIN departments ON departments.id = problems.department_id
     WHERE ${problemFilters.join(' AND ')}
     ORDER BY problems.priority_score DESC`,
    problemParams,
  )

  const interviews = await all(
    `SELECT interviews.*, departments.name AS department_name
     FROM interviews
     JOIN departments ON departments.id = interviews.department_id
     ${interviewFilters.length ? `WHERE ${interviewFilters.join(' AND ')}` : ''}
     ORDER BY interviews.interview_date DESC`,
    interviewParams,
  )

  res.json({
    filters: {
      department_id: departmentId,
      min_priority: minPriority,
    },
    summary: {
      interviewCount: interviews.length,
      problemCount: problems.length,
    },
    interviews,
    problems,
  })
})

app.get('/api/export/problems', async (req, res) => {
  const departmentId = req.query.department_id ? parseInteger(req.query.department_id, 0) : null
  const minPriority = parseNumber(req.query.min_priority, 0)

  const filters = ['priority_score >= ?']
  const params = [minPriority]

  if (departmentId) {
    filters.push('department_id = ?')
    params.push(departmentId)
  }

  const rows = await all(`SELECT * FROM problems WHERE ${filters.join(' AND ')} ORDER BY priority_score DESC`, params)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="problems.csv"')
  res.send(toCsv(rows))
})

app.get('/api/export/interviews', async (req, res) => {
  const departmentId = req.query.department_id ? parseInteger(req.query.department_id, 0) : null

  const rows = await all(
    `SELECT * FROM interviews ${departmentId ? 'WHERE department_id = ?' : ''} ORDER BY interview_date DESC`,
    departmentId ? [departmentId] : [],
  )

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="interviews.csv"')
  res.send(toCsv(rows))
})

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error at request', { method: req.method, path: req.path }, err)
  res.status(500).json({ error: 'حدث خطأ في الخادم' })
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Database initialization failed', error)
    process.exit(1)
  })
