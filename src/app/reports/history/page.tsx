'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { FileText, Calendar, Building2, ArrowRight, Trash2 } from 'lucide-react'

interface SavedReport {
  id: string
  name: string
  propertyCount: number
  createdAt: string
  propertyIds: string[]
}

export default function ReportsHistoryPage() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])

  useEffect(() => {
    // Load saved reports from localStorage
    const stored = localStorage.getItem('taxproperty_saved_reports')
    if (stored) {
      setSavedReports(JSON.parse(stored))
    }
  }, [])

  const deleteReport = (id: string) => {
    const updated = savedReports.filter(r => r.id !== id)
    setSavedReports(updated)
    localStorage.setItem('taxproperty_saved_reports', JSON.stringify(updated))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Saved Reports</h1>
            <p className="text-slate-500 mt-1">Previously generated investment reports</p>
          </div>
          <Link
            href="/properties"
            className="btn btn-primary gap-2"
          >
            <Building2 size={18} />
            Generate New Report
          </Link>
        </div>

        {savedReports.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No saved reports yet</h3>
            <p className="text-slate-500 mb-6">
              When you generate reports from the Properties page, they will be saved here for quick access.
            </p>
            <Link href="/properties" className="btn btn-secondary">
              Go to Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedReports.map((report) => (
              <div key={report.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{report.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(report.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 size={14} />
                        {report.propertyCount} properties
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/reports?ids=${report.propertyIds.join(',')}`}
                    className="btn btn-secondary gap-1"
                  >
                    View
                    <ArrowRight size={16} />
                  </Link>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete report"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
