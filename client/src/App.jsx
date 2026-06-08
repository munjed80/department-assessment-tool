import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'department-assessment-tool:v2'

const pages = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'departments', label: 'الإدارات' },
  { key: 'interviews', label: 'المقابلات' },
  { key: 'problems', label: 'المشكلات' },
  { key: 'reports', label: 'التقارير' },
]

const emptyData = {
  departments: [],
  interviews: [],
  problems: [],
}

const departmentTemplate = {
  name: '',
  head_name: '',
  phone: '',
  employees_count: 0,
  official_responsibilities: '',
  current_tools: '',
  digital_readiness_score: 0,
  notes: '',
}

const interviewTemplate = {
  department_id: '',
  interview_date: '',
  interviewed_person: '',
  position: '',
  current_workflow_summary: '',
  main_routines: '',
  main_problems: '',
  cooperation_score: 0,
  resistance_score: 0,
  notes: '',
  next_steps: '',
}

const problemTemplate = {
  department_id: '',
  title: '',
  description: '',
  root_cause: '',
  impact_type: '',
  severity_score: 1,
  frequency_score: 1,
  urgency_score: 1,
  suggested_solution: '',
  estimated_cost: 0,
  status: 'open',
  notes: '',
}

const fieldClass = 'w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200'
const buttonClass = 'rounded-md px-4 py-2 text-sm font-medium shadow-sm transition hover:opacity-90'

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getNextId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1

const calculatePriority = (problem) =>
  parseNumber(problem.severity_score, 0) * parseNumber(problem.frequency_score, 0) * parseNumber(problem.urgency_score, 0)

const normalizeDepartment = (department) => ({
  ...departmentTemplate,
  ...department,
  name: String(department.name || '').trim(),
  employees_count: parseNumber(department.employees_count, 0),
  digital_readiness_score: parseNumber(department.digital_readiness_score, 0),
})

const normalizeInterview = (interview) => ({
  ...interviewTemplate,
  ...interview,
  department_id: Number(interview.department_id),
  cooperation_score: parseNumber(interview.cooperation_score, 0),
  resistance_score: parseNumber(interview.resistance_score, 0),
})

const normalizeProblem = (problem) => {
  const normalized = {
    ...problemTemplate,
    ...problem,
    department_id: Number(problem.department_id),
    title: String(problem.title || '').trim(),
    severity_score: parseNumber(problem.severity_score, 1),
    frequency_score: parseNumber(problem.frequency_score, 1),
    urgency_score: parseNumber(problem.urgency_score, 1),
    estimated_cost: parseNumber(problem.estimated_cost, 0),
  }

  return { ...normalized, priority_score: calculatePriority(normalized) }
}

const addNames = (items, departments) =>
  items.map((item) => ({
    ...item,
    department_name: departments.find((department) => department.id === Number(item.department_id))?.name || 'غير محدد',
  }))

const loadStoredData = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved) return emptyData

    const departments = (saved.departments || []).map((item) => normalizeDepartment(item))
    const interviews = (saved.interviews || []).map((item) => normalizeInterview(item))
    const problems = (saved.problems || []).map((item) => normalizeProblem(item))

    return { departments, interviews, problems }
  } catch {
    return emptyData
  }
}

const saveFile = (content, filename, type) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const csvEscape = (value) => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

const toCsv = (rows, headers) => {
  const lines = [headers.map((header) => csvEscape(header.label)).join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header.key])).join(','))
  })
  return `\ufeff${lines.join('\n')}\n`
}

const todayStamp = () => new Date().toISOString().slice(0, 10)

const statCard = (title, value) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
  </div>
)

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState(loadStoredData)

  const [departmentForm, setDepartmentForm] = useState(departmentTemplate)
  const [interviewForm, setInterviewForm] = useState(interviewTemplate)
  const [problemForm, setProblemForm] = useState(problemTemplate)

  const [editingDepartmentId, setEditingDepartmentId] = useState(null)
  const [editingInterviewId, setEditingInterviewId] = useState(null)
  const [editingProblemId, setEditingProblemId] = useState(null)
  const [reportFilter, setReportFilter] = useState({ department_id: '', min_priority: 0 })
  const importInputRef = useRef(null)

  const { departments, interviews, problems } = data

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const departmentOptions = useMemo(
    () => departments.map((item) => ({ value: String(item.id), label: item.name })),
    [departments],
  )

  const interviewsWithNames = useMemo(() => addNames(interviews, departments), [interviews, departments])
  const problemsWithNames = useMemo(() => addNames(problems, departments), [problems, departments])

  const dashboard = useMemo(() => {
    const topProblems = [...problemsWithNames].sort((a, b) => b.priority_score - a.priority_score).slice(0, 5)
    return {
      totalDepartments: departments.length,
      totalInterviews: interviews.length,
      totalProblems: problems.length,
      highPriorityProblems: problems.filter((item) => item.priority_score >= 50).length,
      topProblems,
    }
  }, [departments.length, interviews.length, problems, problemsWithNames])

  const filteredProblems = useMemo(() => {
    const departmentId = reportFilter.department_id ? Number(reportFilter.department_id) : null
    const minPriority = parseNumber(reportFilter.min_priority, 0)

    return problemsWithNames.filter((problem) => {
      const departmentMatch = !departmentId || problem.department_id === departmentId
      const priorityMatch = problem.priority_score >= minPriority
      return departmentMatch && priorityMatch
    })
  }, [problemsWithNames, reportFilter])

  const filteredInterviews = useMemo(() => {
    const departmentId = reportFilter.department_id ? Number(reportFilter.department_id) : null
    return interviewsWithNames.filter((interview) => !departmentId || interview.department_id === departmentId)
  }, [interviewsWithNames, reportFilter.department_id])

  const resetDepartmentForm = () => {
    setDepartmentForm(departmentTemplate)
    setEditingDepartmentId(null)
  }

  const resetInterviewForm = () => {
    setInterviewForm({ ...interviewTemplate, department_id: departmentOptions[0]?.value || '' })
    setEditingInterviewId(null)
  }

  const resetProblemForm = () => {
    setProblemForm({ ...problemTemplate, department_id: departmentOptions[0]?.value || '' })
    setEditingProblemId(null)
  }

  const updateData = (updater, successMessage) => {
    setError('')
    setMessage('')
    setData((current) => updater(current))
    setMessage(successMessage)
  }

  const submitDepartment = (event) => {
    event.preventDefault()
    const item = normalizeDepartment(departmentForm)
    if (!item.name) {
      setError('اسم الإدارة مطلوب.')
      return
    }

    updateData((current) => {
      if (editingDepartmentId) {
        return {
          ...current,
          departments: current.departments.map((department) =>
            department.id === editingDepartmentId ? { ...department, ...item } : department,
          ),
        }
      }

      return {
        ...current,
        departments: [{ ...item, id: getNextId(current.departments), created_at: new Date().toISOString() }, ...current.departments],
      }
    }, 'تم حفظ الإدارة محليًا.')
    resetDepartmentForm()
  }

  const submitInterview = (event) => {
    event.preventDefault()
    const item = normalizeInterview(interviewForm)
    if (!item.department_id) {
      setError('اختر الإدارة قبل حفظ المقابلة.')
      return
    }

    updateData((current) => {
      if (editingInterviewId) {
        return {
          ...current,
          interviews: current.interviews.map((interview) =>
            interview.id === editingInterviewId ? { ...interview, ...item } : interview,
          ),
        }
      }

      return {
        ...current,
        interviews: [{ ...item, id: getNextId(current.interviews), created_at: new Date().toISOString() }, ...current.interviews],
      }
    }, 'تم حفظ المقابلة محليًا.')
    resetInterviewForm()
  }

  const submitProblem = (event) => {
    event.preventDefault()
    const item = normalizeProblem(problemForm)
    if (!item.department_id || !item.title) {
      setError('اختر الإدارة واكتب عنوان المشكلة قبل الحفظ.')
      return
    }

    updateData((current) => {
      if (editingProblemId) {
        return {
          ...current,
          problems: current.problems.map((problem) =>
            problem.id === editingProblemId ? { ...problem, ...item } : problem,
          ),
        }
      }

      return {
        ...current,
        problems: [{ ...item, id: getNextId(current.problems), created_at: new Date().toISOString() }, ...current.problems],
      }
    }, 'تم حفظ المشكلة محليًا مع حساب الأولوية تلقائيًا.')
    resetProblemForm()
  }

  const removeItem = (type, id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return

    updateData((current) => {
      if (type === 'departments') {
        return {
          departments: current.departments.filter((item) => item.id !== id),
          interviews: current.interviews.filter((item) => item.department_id !== id),
          problems: current.problems.filter((item) => item.department_id !== id),
        }
      }

      return { ...current, [type]: current[type].filter((item) => item.id !== id) }
    }, 'تم الحذف من التخزين المحلي.')

    if (type === 'departments') resetDepartmentForm()
    if (type === 'interviews') resetInterviewForm()
    if (type === 'problems') resetProblemForm()
  }

  const exportBackup = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      app: 'department-assessment-tool',
      version: 2,
      ...data,
    }
    saveFile(JSON.stringify(payload, null, 2), `department-assessment-backup-${todayStamp()}.json`, 'application/json;charset=utf-8')
  }

  const importBackup = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const payload = JSON.parse(await file.text())
      const nextData = {
        departments: (payload.departments || []).map((item) => normalizeDepartment(item)).filter((item) => item.id && item.name),
        interviews: (payload.interviews || []).map((item) => normalizeInterview(item)).filter((item) => item.id && item.department_id),
        problems: (payload.problems || []).map((item) => normalizeProblem(item)).filter((item) => item.id && item.department_id),
      }

      setData(nextData)
      setMessage('تم استيراد النسخة الاحتياطية وحفظها في المتصفح.')
      setError('')
      resetDepartmentForm()
      resetInterviewForm()
      resetProblemForm()
    } catch {
      setError('ملف النسخة الاحتياطية غير صالح.')
    } finally {
      event.target.value = ''
    }
  }

  const exportProblemsCsv = () => {
    const headers = [
      { key: 'id', label: 'id' },
      { key: 'department_name', label: 'department_name' },
      { key: 'title', label: 'title' },
      { key: 'description', label: 'description' },
      { key: 'root_cause', label: 'root_cause' },
      { key: 'impact_type', label: 'impact_type' },
      { key: 'severity_score', label: 'severity_score' },
      { key: 'frequency_score', label: 'frequency_score' },
      { key: 'urgency_score', label: 'urgency_score' },
      { key: 'priority_score', label: 'priority_score' },
      { key: 'suggested_solution', label: 'suggested_solution' },
      { key: 'estimated_cost', label: 'estimated_cost' },
      { key: 'status', label: 'status' },
      { key: 'notes', label: 'notes' },
    ]
    saveFile(toCsv(filteredProblems, headers), `problems-${todayStamp()}.csv`, 'text/csv;charset=utf-8')
  }

  const exportInterviewsCsv = () => {
    const headers = [
      { key: 'id', label: 'id' },
      { key: 'department_name', label: 'department_name' },
      { key: 'interview_date', label: 'interview_date' },
      { key: 'interviewed_person', label: 'interviewed_person' },
      { key: 'position', label: 'position' },
      { key: 'current_workflow_summary', label: 'current_workflow_summary' },
      { key: 'main_routines', label: 'main_routines' },
      { key: 'main_problems', label: 'main_problems' },
      { key: 'cooperation_score', label: 'cooperation_score' },
      { key: 'resistance_score', label: 'resistance_score' },
      { key: 'next_steps', label: 'next_steps' },
      { key: 'notes', label: 'notes' },
    ]
    saveFile(toCsv(filteredInterviews, headers), `interviews-${todayStamp()}.csv`, 'text/csv;charset=utf-8')
  }

  const printReport = () => window.print()

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 text-right text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm print:hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Department Assessment Tool</h1>
              <p className="mt-2 text-sm text-slate-600">أداة عربية بسيطة تعمل بدون خادم أو قاعدة بيانات، وتحفظ بيانات التقييم داخل المتصفح على هذا الجهاز.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={`${buttonClass} bg-emerald-600 text-white`} type="button" onClick={exportBackup}>تصدير نسخة JSON</button>
              <button className={`${buttonClass} bg-indigo-600 text-white`} type="button" onClick={() => importInputRef.current?.click()}>استيراد JSON</button>
              <input ref={importInputRef} className="hidden" type="file" accept="application/json,.json" onChange={importBackup} />
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {pages.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  activePage === item.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => setActivePage(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        {(message || error) && (
          <div className={`rounded-xl border p-3 text-sm print:hidden ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        {activePage === 'dashboard' && (
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {statCard('إجمالي الإدارات', dashboard.totalDepartments)}
              {statCard('إجمالي المقابلات', dashboard.totalInterviews)}
              {statCard('إجمالي المشكلات', dashboard.totalProblems)}
              {statCard('مشكلات عالية الأولوية (50+)', dashboard.highPriorityProblems)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">أعلى المشكلات حسب الأولوية</h2>
              <div className="space-y-2">
                {dashboard.topProblems.length === 0 && <p className="text-sm text-slate-500">لا توجد مشكلات بعد.</p>}
                {dashboard.topProblems.map((problem) => (
                  <article key={problem.id} className="rounded-md bg-slate-50 p-3">
                    <p className="font-semibold">{problem.title}</p>
                    <p className="text-sm text-slate-600">{problem.department_name} · الأولوية: {problem.priority_score}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {activePage === 'departments' && (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submitDepartment}>
              <h2 className="text-lg font-semibold">{editingDepartmentId ? 'تعديل إدارة' : 'إضافة إدارة'}</h2>
              <input className={fieldClass} placeholder="اسم الإدارة" value={departmentForm.name} onChange={(e) => setDepartmentForm((p) => ({ ...p, name: e.target.value }))} required />
              <input className={fieldClass} placeholder="اسم رئيس الإدارة" value={departmentForm.head_name} onChange={(e) => setDepartmentForm((p) => ({ ...p, head_name: e.target.value }))} />
              <input className={fieldClass} placeholder="رقم التواصل" value={departmentForm.phone} onChange={(e) => setDepartmentForm((p) => ({ ...p, phone: e.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={fieldClass} type="number" min="0" placeholder="عدد الموظفين" value={departmentForm.employees_count} onChange={(e) => setDepartmentForm((p) => ({ ...p, employees_count: e.target.value }))} />
                <input className={fieldClass} type="number" min="0" max="10" placeholder="جاهزية رقمية 0-10" value={departmentForm.digital_readiness_score} onChange={(e) => setDepartmentForm((p) => ({ ...p, digital_readiness_score: e.target.value }))} />
              </div>
              <textarea className={fieldClass} placeholder="المسؤوليات الرسمية" value={departmentForm.official_responsibilities} onChange={(e) => setDepartmentForm((p) => ({ ...p, official_responsibilities: e.target.value }))} />
              <textarea className={fieldClass} placeholder="الأدوات الحالية" value={departmentForm.current_tools} onChange={(e) => setDepartmentForm((p) => ({ ...p, current_tools: e.target.value }))} />
              <textarea className={fieldClass} placeholder="ملاحظات" value={departmentForm.notes} onChange={(e) => setDepartmentForm((p) => ({ ...p, notes: e.target.value }))} />
              <div className="flex gap-2">
                <button className={`${buttonClass} bg-slate-900 text-white`} type="submit">حفظ</button>
                <button className={`${buttonClass} bg-slate-200 text-slate-800`} type="button" onClick={resetDepartmentForm}>إلغاء</button>
              </div>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">قائمة الإدارات</h2>
              {departments.length === 0 && <p className="text-sm text-slate-500">لا توجد إدارات.</p>}
              {departments.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-slate-600">رئيس الإدارة: {item.head_name || '-'}</p>
                  <p className="text-sm text-slate-600">الأدوات الحالية: {item.current_tools || '-'}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded bg-slate-800 px-3 py-1 text-xs text-white" type="button" onClick={() => { setDepartmentForm(item); setEditingDepartmentId(item.id) }}>تعديل</button>
                    <button className="rounded bg-rose-600 px-3 py-1 text-xs text-white" type="button" onClick={() => removeItem('departments', item.id)}>حذف</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'interviews' && (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submitInterview}>
              <h2 className="text-lg font-semibold">{editingInterviewId ? 'تعديل مقابلة' : 'إضافة مقابلة'}</h2>
              <select className={fieldClass} value={interviewForm.department_id} onChange={(e) => setInterviewForm((p) => ({ ...p, department_id: e.target.value }))} required>
                <option value="">اختر الإدارة</option>
                {departmentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <input className={fieldClass} type="date" value={interviewForm.interview_date} onChange={(e) => setInterviewForm((p) => ({ ...p, interview_date: e.target.value }))} />
              <input className={fieldClass} placeholder="اسم الشخص الذي تمت مقابلته" value={interviewForm.interviewed_person} onChange={(e) => setInterviewForm((p) => ({ ...p, interviewed_person: e.target.value }))} />
              <input className={fieldClass} placeholder="المنصب" value={interviewForm.position} onChange={(e) => setInterviewForm((p) => ({ ...p, position: e.target.value }))} />
              <textarea className={fieldClass} placeholder="ملخص سير العمل الحالي" value={interviewForm.current_workflow_summary} onChange={(e) => setInterviewForm((p) => ({ ...p, current_workflow_summary: e.target.value }))} />
              <textarea className={fieldClass} placeholder="الروتينات الرئيسية" value={interviewForm.main_routines} onChange={(e) => setInterviewForm((p) => ({ ...p, main_routines: e.target.value }))} />
              <textarea className={fieldClass} placeholder="المشكلات الرئيسية" value={interviewForm.main_problems} onChange={(e) => setInterviewForm((p) => ({ ...p, main_problems: e.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={fieldClass} type="number" min="0" max="10" placeholder="درجة التعاون" value={interviewForm.cooperation_score} onChange={(e) => setInterviewForm((p) => ({ ...p, cooperation_score: e.target.value }))} />
                <input className={fieldClass} type="number" min="0" max="10" placeholder="درجة المقاومة" value={interviewForm.resistance_score} onChange={(e) => setInterviewForm((p) => ({ ...p, resistance_score: e.target.value }))} />
              </div>
              <textarea className={fieldClass} placeholder="الخطوات القادمة" value={interviewForm.next_steps} onChange={(e) => setInterviewForm((p) => ({ ...p, next_steps: e.target.value }))} />
              <textarea className={fieldClass} placeholder="ملاحظات" value={interviewForm.notes} onChange={(e) => setInterviewForm((p) => ({ ...p, notes: e.target.value }))} />
              <div className="flex gap-2">
                <button className={`${buttonClass} bg-slate-900 text-white`} type="submit">حفظ</button>
                <button className={`${buttonClass} bg-slate-200 text-slate-800`} type="button" onClick={resetInterviewForm}>إلغاء</button>
              </div>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">قائمة المقابلات</h2>
              {interviewsWithNames.length === 0 && <p className="text-sm text-slate-500">لا توجد مقابلات.</p>}
              {interviewsWithNames.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{item.interviewed_person || 'بدون اسم'}</p>
                  <p className="text-sm text-slate-600">الإدارة: {item.department_name} · التاريخ: {item.interview_date || '-'}</p>
                  <p className="text-sm text-slate-600">سير العمل: {item.current_workflow_summary || '-'}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded bg-slate-800 px-3 py-1 text-xs text-white" type="button" onClick={() => { setInterviewForm({ ...item, department_id: String(item.department_id) }); setEditingInterviewId(item.id) }}>تعديل</button>
                    <button className="rounded bg-rose-600 px-3 py-1 text-xs text-white" type="button" onClick={() => removeItem('interviews', item.id)}>حذف</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'problems' && (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submitProblem}>
              <h2 className="text-lg font-semibold">{editingProblemId ? 'تعديل مشكلة' : 'إضافة مشكلة'}</h2>
              <select className={fieldClass} value={problemForm.department_id} onChange={(e) => setProblemForm((p) => ({ ...p, department_id: e.target.value }))} required>
                <option value="">اختر الإدارة</option>
                {departmentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <input className={fieldClass} placeholder="عنوان المشكلة" value={problemForm.title} onChange={(e) => setProblemForm((p) => ({ ...p, title: e.target.value }))} required />
              <textarea className={fieldClass} placeholder="وصف المشكلة" value={problemForm.description} onChange={(e) => setProblemForm((p) => ({ ...p, description: e.target.value }))} />
              <textarea className={fieldClass} placeholder="السبب الجذري" value={problemForm.root_cause} onChange={(e) => setProblemForm((p) => ({ ...p, root_cause: e.target.value }))} />
              <input className={fieldClass} placeholder="نوع الأثر (وقت، تكلفة، جودة...)" value={problemForm.impact_type} onChange={(e) => setProblemForm((p) => ({ ...p, impact_type: e.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-3">
                <input className={fieldClass} type="number" min="1" max="5" placeholder="الشدة" value={problemForm.severity_score} onChange={(e) => setProblemForm((p) => ({ ...p, severity_score: e.target.value }))} />
                <input className={fieldClass} type="number" min="1" max="5" placeholder="التكرار" value={problemForm.frequency_score} onChange={(e) => setProblemForm((p) => ({ ...p, frequency_score: e.target.value }))} />
                <input className={fieldClass} type="number" min="1" max="5" placeholder="الاستعجال" value={problemForm.urgency_score} onChange={(e) => setProblemForm((p) => ({ ...p, urgency_score: e.target.value }))} />
              </div>
              <textarea className={fieldClass} placeholder="الحل المقترح" value={problemForm.suggested_solution} onChange={(e) => setProblemForm((p) => ({ ...p, suggested_solution: e.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={fieldClass} type="number" min="0" placeholder="التكلفة التقديرية" value={problemForm.estimated_cost} onChange={(e) => setProblemForm((p) => ({ ...p, estimated_cost: e.target.value }))} />
                <select className={fieldClass} value={problemForm.status} onChange={(e) => setProblemForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="open">مفتوحة</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="closed">مغلقة</option>
                </select>
              </div>
              <textarea className={fieldClass} placeholder="ملاحظات" value={problemForm.notes} onChange={(e) => setProblemForm((p) => ({ ...p, notes: e.target.value }))} />
              <p className="rounded-md bg-slate-100 p-2 text-sm text-slate-700">درجة الأولوية الحالية: {calculatePriority(problemForm)}</p>
              <div className="flex gap-2">
                <button className={`${buttonClass} bg-slate-900 text-white`} type="submit">حفظ</button>
                <button className={`${buttonClass} bg-slate-200 text-slate-800`} type="button" onClick={resetProblemForm}>إلغاء</button>
              </div>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">قائمة المشكلات</h2>
              {problemsWithNames.length === 0 && <p className="text-sm text-slate-500">لا توجد مشكلات.</p>}
              {problemsWithNames.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-slate-600">الإدارة: {item.department_name} · الأولوية: {item.priority_score}</p>
                  <p className="text-sm text-slate-600">السبب الجذري: {item.root_cause || '-'}</p>
                  <p className="text-sm text-slate-600">الحل المقترح: {item.suggested_solution || '-'}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded bg-slate-800 px-3 py-1 text-xs text-white" type="button" onClick={() => { setProblemForm({ ...item, department_id: String(item.department_id) }); setEditingProblemId(item.id) }}>تعديل</button>
                    <button className="rounded bg-rose-600 px-3 py-1 text-xs text-white" type="button" onClick={() => removeItem('problems', item.id)}>حذف</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'reports' && (
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
              <h2 className="mb-3 text-lg font-semibold">التقارير والتصدير</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <select className={fieldClass} value={reportFilter.department_id} onChange={(e) => setReportFilter((p) => ({ ...p, department_id: e.target.value }))}>
                  <option value="">كل الإدارات</option>
                  {departmentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <input className={fieldClass} type="number" min="0" placeholder="أقل أولوية" value={reportFilter.min_priority} onChange={(e) => setReportFilter((p) => ({ ...p, min_priority: e.target.value }))} />
                <button className={`${buttonClass} bg-slate-900 text-white`} type="button" onClick={printReport}>طباعة تقرير الإدارة</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={`${buttonClass} bg-emerald-600 text-white`} type="button" onClick={exportProblemsCsv}>تصدير المشكلات CSV</button>
                <button className={`${buttonClass} bg-indigo-600 text-white`} type="button" onClick={exportInterviewsCsv}>تصدير المقابلات CSV</button>
                <button className={`${buttonClass} bg-slate-700 text-white`} type="button" onClick={exportBackup}>تصدير كل البيانات JSON</button>
              </div>
            </div>

            <div className="print-report rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 border-b border-slate-200 pb-4">
                <p className="text-sm text-slate-500">تقرير إداري قابل للطباعة</p>
                <h2 className="text-2xl font-bold">ملخص تقييم الإدارات</h2>
                <p className="mt-1 text-sm text-slate-600">تاريخ التقرير: {new Date().toLocaleDateString('ar')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {statCard('الإدارات', departments.length)}
                {statCard('المقابلات المطابقة', filteredInterviews.length)}
                {statCard('المشكلات المطابقة', filteredProblems.length)}
                {statCard('متوسط الأولوية', filteredProblems.length ? Math.round(filteredProblems.reduce((sum, item) => sum + item.priority_score, 0) / filteredProblems.length) : 0)}
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold">المشكلات حسب الأولوية</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-200 p-2">الإدارة</th>
                        <th className="border border-slate-200 p-2">المشكلة</th>
                        <th className="border border-slate-200 p-2">السبب الجذري</th>
                        <th className="border border-slate-200 p-2">الحل المقترح</th>
                        <th className="border border-slate-200 p-2">الأولوية</th>
                        <th className="border border-slate-200 p-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProblems.length === 0 && (
                        <tr><td className="border border-slate-200 p-3 text-center text-slate-500" colSpan="6">لا توجد نتائج.</td></tr>
                      )}
                      {[...filteredProblems].sort((a, b) => b.priority_score - a.priority_score).map((item) => (
                        <tr key={item.id}>
                          <td className="border border-slate-200 p-2">{item.department_name}</td>
                          <td className="border border-slate-200 p-2">{item.title}</td>
                          <td className="border border-slate-200 p-2">{item.root_cause || '-'}</td>
                          <td className="border border-slate-200 p-2">{item.suggested_solution || '-'}</td>
                          <td className="border border-slate-200 p-2 font-semibold">{item.priority_score}</td>
                          <td className="border border-slate-200 p-2">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold">ملخص المقابلات</h3>
                <div className="grid gap-3">
                  {filteredInterviews.length === 0 && <p className="text-sm text-slate-500">لا توجد مقابلات مطابقة.</p>}
                  {filteredInterviews.map((item) => (
                    <article key={item.id} className="rounded-md border border-slate-200 p-3">
                      <p className="font-semibold">{item.department_name} · {item.interviewed_person || 'بدون اسم'} · {item.interview_date || '-'}</p>
                      <p className="text-sm text-slate-600">سير العمل: {item.current_workflow_summary || '-'}</p>
                      <p className="text-sm text-slate-600">المشكلات الرئيسية: {item.main_problems || '-'}</p>
                      <p className="text-sm text-slate-600">الخطوات القادمة: {item.next_steps || '-'}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
