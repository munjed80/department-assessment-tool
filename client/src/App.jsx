import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const pages = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'departments', label: 'الإدارات' },
  { key: 'interviews', label: 'المقابلات' },
  { key: 'problems', label: 'المشكلات' },
  { key: 'reports', label: 'التقارير' },
]

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

const api = async (path, options) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'حدث خطأ أثناء تنفيذ الطلب')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

const statCard = (title, value) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
  </div>
)

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [departments, setDepartments] = useState([])
  const [interviews, setInterviews] = useState([])
  const [problems, setProblems] = useState([])
  const [dashboard, setDashboard] = useState({
    totalDepartments: 0,
    totalInterviews: 0,
    totalProblems: 0,
    highPriorityProblems: 0,
    topProblems: [],
  })

  const [departmentForm, setDepartmentForm] = useState(departmentTemplate)
  const [interviewForm, setInterviewForm] = useState(interviewTemplate)
  const [problemForm, setProblemForm] = useState(problemTemplate)

  const [editingDepartmentId, setEditingDepartmentId] = useState(null)
  const [editingInterviewId, setEditingInterviewId] = useState(null)
  const [editingProblemId, setEditingProblemId] = useState(null)

  const [reportFilter, setReportFilter] = useState({ department_id: '', min_priority: 0 })
  const [reportData, setReportData] = useState({ summary: { interviewCount: 0, problemCount: 0 }, problems: [] })

  const departmentOptions = useMemo(
    () => departments.map((item) => ({ value: String(item.id), label: item.name })),
    [departments],
  )

  const loadAllData = async () => {
    setLoading(true)
    setError('')
    try {
      const [departmentRows, interviewRows, problemRows, dashboardPayload] = await Promise.all([
        api('/departments'),
        api('/interviews'),
        api('/problems'),
        api('/dashboard'),
      ])

      setDepartments(departmentRows)
      setInterviews(interviewRows)
      setProblems(problemRows)
      setDashboard(dashboardPayload)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadReport = async (filter = reportFilter) => {
    const params = new URLSearchParams()
    if (filter.department_id) params.set('department_id', filter.department_id)
    if (filter.min_priority) params.set('min_priority', filter.min_priority)

    try {
      const data = await api(`/reports?${params.toString()}`)
      setReportData(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    const run = async () => {
      await loadAllData()
    }
    void run()
  }, [])

  useEffect(() => {
    const run = async () => {
      await loadReport()
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments.length])

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

  const submitDepartment = async (event) => {
    event.preventDefault()
    try {
      if (editingDepartmentId) {
        await api(`/departments/${editingDepartmentId}`, {
          method: 'PUT',
          body: JSON.stringify(departmentForm),
        })
      } else {
        await api('/departments', { method: 'POST', body: JSON.stringify(departmentForm) })
      }

      resetDepartmentForm()
      await loadAllData()
    } catch (err) {
      setError(err.message)
    }
  }

  const submitInterview = async (event) => {
    event.preventDefault()
    try {
      if (editingInterviewId) {
        await api(`/interviews/${editingInterviewId}`, {
          method: 'PUT',
          body: JSON.stringify(interviewForm),
        })
      } else {
        await api('/interviews', { method: 'POST', body: JSON.stringify(interviewForm) })
      }

      resetInterviewForm()
      await loadAllData()
      await loadReport()
    } catch (err) {
      setError(err.message)
    }
  }

  const submitProblem = async (event) => {
    event.preventDefault()
    try {
      if (editingProblemId) {
        await api(`/problems/${editingProblemId}`, {
          method: 'PUT',
          body: JSON.stringify(problemForm),
        })
      } else {
        await api('/problems', { method: 'POST', body: JSON.stringify(problemForm) })
      }

      resetProblemForm()
      await loadAllData()
      await loadReport()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeItem = async (type, id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return

    try {
      await api(`/${type}/${id}`, { method: 'DELETE' })
      await loadAllData()
      await loadReport()

      if (type === 'departments') resetDepartmentForm()
      if (type === 'interviews') resetInterviewForm()
      if (type === 'problems') resetProblemForm()
    } catch (err) {
      setError(err.message)
    }
  }

  const openProblemExport = () => {
    const params = new URLSearchParams()
    if (reportFilter.department_id) params.set('department_id', reportFilter.department_id)
    if (reportFilter.min_priority) params.set('min_priority', reportFilter.min_priority)
    window.open(`${API_BASE}/export/problems?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  const openInterviewExport = () => {
    const params = new URLSearchParams()
    if (reportFilter.department_id) params.set('department_id', reportFilter.department_id)
    window.open(`${API_BASE}/export/interviews?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 text-right">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Department Assessment Tool</h1>
          <p className="mt-2 text-sm text-slate-600">أداة داخلية لتقييم الإدارات وتحليل المشكلات في رحلة التحول الرقمي</p>
          <nav className="mt-4 flex flex-wrap gap-2">
            {pages.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  activePage === item.key ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800'
                }`}
                onClick={() => setActivePage(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {loading && <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>}

        {activePage === 'dashboard' && (
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {statCard('إجمالي الإدارات', dashboard.totalDepartments)}
              {statCard('إجمالي المقابلات', dashboard.totalInterviews)}
              {statCard('إجمالي المشكلات', dashboard.totalProblems)}
              {statCard('مشكلات عالية الأولوية', dashboard.highPriorityProblems)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">أعلى المشكلات حسب الأولوية</h2>
              <ul className="space-y-2">
                {dashboard.topProblems.length === 0 && <li className="text-sm text-slate-500">لا توجد بيانات بعد.</li>}
                {dashboard.topProblems.map((item) => (
                  <li key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <span className="font-semibold">{item.title}</span>
                    <span className="mx-2 text-slate-500">({item.department_name})</span>
                    <span className="text-slate-700">الأولوية: {item.priority_score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {activePage === 'departments' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submitDepartment}>
              <h2 className="text-lg font-semibold">{editingDepartmentId ? 'تعديل إدارة' : 'إضافة إدارة'}</h2>
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="اسم الإدارة"
                value={departmentForm.name}
                onChange={(event) => setDepartmentForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="اسم المدير"
                value={departmentForm.head_name}
                onChange={(event) => setDepartmentForm((prev) => ({ ...prev, head_name: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="رقم الهاتف"
                value={departmentForm.phone}
                onChange={(event) => setDepartmentForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                type="number"
                placeholder="عدد الموظفين"
                value={departmentForm.employees_count}
                onChange={(event) => setDepartmentForm((prev) => ({ ...prev, employees_count: event.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="المهام الرسمية"
                value={departmentForm.official_responsibilities}
                onChange={(event) =>
                  setDepartmentForm((prev) => ({ ...prev, official_responsibilities: event.target.value }))
                }
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="الأدوات الحالية"
                value={departmentForm.current_tools}
                onChange={(event) => setDepartmentForm((prev) => ({ ...prev, current_tools: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                type="number"
                min="0"
                max="100"
                placeholder="درجة الجاهزية الرقمية"
                value={departmentForm.digital_readiness_score}
                onChange={(event) =>
                  setDepartmentForm((prev) => ({ ...prev, digital_readiness_score: event.target.value }))
                }
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="ملاحظات"
                value={departmentForm.notes}
                onChange={(event) => setDepartmentForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <div className="flex gap-2">
                <button className="rounded-md bg-slate-900 px-4 py-2 text-white" type="submit">
                  حفظ
                </button>
                <button className="rounded-md bg-slate-200 px-4 py-2" type="button" onClick={resetDepartmentForm}>
                  إلغاء
                </button>
              </div>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">قائمة الإدارات</h2>
              {departments.length === 0 && <p className="text-sm text-slate-500">لا توجد إدارات مضافة.</p>}
              {departments.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-slate-600">المدير: {item.head_name || '-'}</p>
                  <p className="text-sm text-slate-600">عدد الموظفين: {item.employees_count}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-slate-800 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() => {
                        setDepartmentForm(item)
                        setEditingDepartmentId(item.id)
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      className="rounded bg-rose-600 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() => removeItem('departments', item.id)}
                    >
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'interviews' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submitInterview}>
              <h2 className="text-lg font-semibold">{editingInterviewId ? 'تعديل مقابلة' : 'إضافة مقابلة'}</h2>
              <select
                className="w-full rounded-md border border-slate-300 p-2"
                value={interviewForm.department_id}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, department_id: event.target.value }))}
                required
              >
                <option value="">اختر الإدارة</option>
                {departmentOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                type="date"
                value={interviewForm.interview_date}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, interview_date: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="اسم الشخص الذي تمت مقابلته"
                value={interviewForm.interviewed_person}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, interviewed_person: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="المنصب"
                value={interviewForm.position}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, position: event.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="ملخص سير العمل الحالي"
                value={interviewForm.current_workflow_summary}
                onChange={(event) =>
                  setInterviewForm((prev) => ({ ...prev, current_workflow_summary: event.target.value }))
                }
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="الروتينات الرئيسية"
                value={interviewForm.main_routines}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, main_routines: event.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="المشكلات الرئيسية"
                value={interviewForm.main_problems}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, main_problems: event.target.value }))}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-slate-300 p-2"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="درجة التعاون"
                  value={interviewForm.cooperation_score}
                  onChange={(event) => setInterviewForm((prev) => ({ ...prev, cooperation_score: event.target.value }))}
                />
                <input
                  className="rounded-md border border-slate-300 p-2"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="درجة المقاومة"
                  value={interviewForm.resistance_score}
                  onChange={(event) => setInterviewForm((prev) => ({ ...prev, resistance_score: event.target.value }))}
                />
              </div>
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="الخطوات القادمة"
                value={interviewForm.next_steps}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, next_steps: event.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="ملاحظات"
                value={interviewForm.notes}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <div className="flex gap-2">
                <button className="rounded-md bg-slate-900 px-4 py-2 text-white" type="submit">
                  حفظ
                </button>
                <button className="rounded-md bg-slate-200 px-4 py-2" type="button" onClick={resetInterviewForm}>
                  إلغاء
                </button>
              </div>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">قائمة المقابلات</h2>
              {interviews.length === 0 && <p className="text-sm text-slate-500">لا توجد مقابلات.</p>}
              {interviews.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{item.interviewed_person || 'بدون اسم'}</p>
                  <p className="text-sm text-slate-600">الإدارة: {item.department_name}</p>
                  <p className="text-sm text-slate-600">التاريخ: {item.interview_date || '-'}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-slate-800 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() => {
                        setInterviewForm({ ...item, department_id: String(item.department_id) })
                        setEditingInterviewId(item.id)
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      className="rounded bg-rose-600 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() => removeItem('interviews', item.id)}
                    >
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'problems' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submitProblem}>
              <h2 className="text-lg font-semibold">{editingProblemId ? 'تعديل مشكلة' : 'إضافة مشكلة'}</h2>
              <select
                className="w-full rounded-md border border-slate-300 p-2"
                value={problemForm.department_id}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, department_id: event.target.value }))}
                required
              >
                <option value="">اختر الإدارة</option>
                {departmentOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="عنوان المشكلة"
                value={problemForm.title}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="وصف المشكلة"
                value={problemForm.description}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="السبب الجذري"
                value={problemForm.root_cause}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, root_cause: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="نوع التأثير"
                value={problemForm.impact_type}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, impact_type: event.target.value }))}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="rounded-md border border-slate-300 p-2"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="الشدة"
                  value={problemForm.severity_score}
                  onChange={(event) => setProblemForm((prev) => ({ ...prev, severity_score: event.target.value }))}
                />
                <input
                  className="rounded-md border border-slate-300 p-2"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="التكرار"
                  value={problemForm.frequency_score}
                  onChange={(event) => setProblemForm((prev) => ({ ...prev, frequency_score: event.target.value }))}
                />
                <input
                  className="rounded-md border border-slate-300 p-2"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="الإلحاح"
                  value={problemForm.urgency_score}
                  onChange={(event) => setProblemForm((prev) => ({ ...prev, urgency_score: event.target.value }))}
                />
              </div>
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="الحل المقترح"
                value={problemForm.suggested_solution}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, suggested_solution: event.target.value }))}
              />
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                type="number"
                min="0"
                placeholder="التكلفة التقديرية"
                value={problemForm.estimated_cost}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, estimated_cost: event.target.value }))}
              />
              <select
                className="w-full rounded-md border border-slate-300 p-2"
                value={problemForm.status}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="open">مفتوحة</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="closed">مغلقة</option>
              </select>
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="ملاحظات"
                value={problemForm.notes}
                onChange={(event) => setProblemForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <p className="rounded-md bg-slate-100 p-2 text-sm text-slate-700">
                درجة الأولوية الحالية: {Number(problemForm.severity_score || 0) * Number(problemForm.frequency_score || 0) * Number(problemForm.urgency_score || 0)}
              </p>
              <div className="flex gap-2">
                <button className="rounded-md bg-slate-900 px-4 py-2 text-white" type="submit">
                  حفظ
                </button>
                <button className="rounded-md bg-slate-200 px-4 py-2" type="button" onClick={resetProblemForm}>
                  إلغاء
                </button>
              </div>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">قائمة المشكلات</h2>
              {problems.length === 0 && <p className="text-sm text-slate-500">لا توجد مشكلات.</p>}
              {problems.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-slate-600">الإدارة: {item.department_name}</p>
                  <p className="text-sm text-slate-600">الأولوية: {item.priority_score}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-slate-800 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() => {
                        setProblemForm({ ...item, department_id: String(item.department_id) })
                        setEditingProblemId(item.id)
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      className="rounded bg-rose-600 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() => removeItem('problems', item.id)}
                    >
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === 'reports' && (
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">تصفية التقارير</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  className="rounded-md border border-slate-300 p-2"
                  value={reportFilter.department_id}
                  onChange={(event) => setReportFilter((prev) => ({ ...prev, department_id: event.target.value }))}
                >
                  <option value="">كل الإدارات</option>
                  {departmentOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-slate-300 p-2"
                  type="number"
                  min="0"
                  placeholder="أقل أولوية"
                  value={reportFilter.min_priority}
                  onChange={(event) => setReportFilter((prev) => ({ ...prev, min_priority: event.target.value }))}
                />
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-white"
                  type="button"
                  onClick={() => loadReport(reportFilter)}
                >
                  تطبيق الفلتر
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-md bg-emerald-600 px-4 py-2 text-white" type="button" onClick={openProblemExport}>
                  تصدير المشكلات CSV
                </button>
                <button className="rounded-md bg-indigo-600 px-4 py-2 text-white" type="button" onClick={openInterviewExport}>
                  تصدير المقابلات CSV
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {statCard('عدد المقابلات المطابقة', reportData.summary.interviewCount)}
              {statCard('عدد المشكلات المطابقة', reportData.summary.problemCount)}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold">نتائج المشكلات</h3>
              <ul className="space-y-2">
                {reportData.problems?.length === 0 && <li className="text-sm text-slate-500">لا توجد نتائج.</li>}
                {reportData.problems?.map((item) => (
                  <li key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <span className="font-semibold">{item.title}</span>
                    <span className="mx-2 text-slate-500">({item.department_name})</span>
                    <span>الأولوية: {item.priority_score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
