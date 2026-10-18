'use client'

import React, { useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import { userResolver } from '@/lib/user-resolver'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

interface BulkImportRecord {
  id: string
  fileName: string
  originalFileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  errors: string[]
  createdAt: string
  completedAt?: string
  userId: string
  summary?: {
    productsCreated: number
    productsUpdated: number
    categoriesCreated: number
    uomsCreated: number
  }
}

interface PDFReportGeneratorProps {
  record: BulkImportRecord
  onGenerateComplete?: () => void
}

export default function PDFReportGenerator({ record, onGenerateComplete }: PDFReportGeneratorProps) {
  const reportRef = useRef<HTMLDivElement>(null)

  const generatePDF = async () => {
    if (!reportRef.current) {
      console.error('Report ref not found')
      return
    }

    try {
      console.log('Starting PDF generation...')
      
      // Generate canvas from the report content
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      console.log('Canvas generated, creating PDF...')
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save the PDF
      const fileName = `bulk-import-report-${record.id}.pdf`
      pdf.save(fileName)
      
      console.log('PDF generated successfully:', fileName)
      
      if (onGenerateComplete) {
        onGenerateComplete()
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  // Expose generatePDF function globally for external access
  React.useEffect(() => {
    (window as any).generatePDFReport = generatePDF
    return () => {
      delete (window as any).generatePDFReport
    }
  }, [generatePDF])

  // Chart data for success/failure pie chart
  const pieChartData = {
    labels: ['Successful', 'Failed'],
    datasets: [
      {
        data: [record.successfulRecords, record.failedRecords],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: ['#059669', '#DC2626'],
        borderWidth: 2,
      },
    ],
  }

  // Chart data for summary bar chart
  const summaryChartData = {
    labels: ['Products Created', 'Products Updated', 'Categories Created', 'UOMs Created'],
    datasets: [
      {
        label: 'Count',
        data: [
          record.summary?.productsCreated || 0,
          record.summary?.productsUpdated || 0,
          record.summary?.categoriesCreated || 0,
          record.summary?.uomsCreated || 0,
        ],
        backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
        borderColor: ['#2563EB', '#7C3AED', '#D97706', '#059669'],
        borderWidth: 1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981'
      case 'failed': return '#EF4444'
      case 'processing': return '#3B82F6'
      default: return '#6B7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed Successfully'
      case 'failed': return 'Failed'
      case 'processing': return 'Processing'
      default: return 'Pending'
    }
  }

  return (
    <div className="hidden">
      <div ref={reportRef} className="bg-white p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Import Report</h1>
          <p className="text-lg text-gray-600">Import Operation Analysis</p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Import Details */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Import Details</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">File Name:</span>
                <p className="text-gray-900">{record.originalFileName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span 
                  className="ml-2 px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: getStatusColor(record.status) }}
                >
                  {getStatusText(record.status)}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Records:</span>
                <p className="text-gray-900">{record.totalRecords}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Import Date:</span>
                <p className="text-gray-900">{new Date(record.createdAt).toLocaleString()}</p>
              </div>
              {record.completedAt && (
                <div>
                  <span className="font-medium text-gray-700">Completed:</span>
                  <p className="text-gray-900">{new Date(record.completedAt).toLocaleString()}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Imported By:</span>
                <p className="text-gray-900">{userResolver.getUserName(record.userId)} ({userResolver.getUserEmail(record.userId)})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Import Statistics</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{record.successfulRecords}</div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{record.failedRecords}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {record.totalRecords > 0 ? Math.round((record.successfulRecords / record.totalRecords) * 100) : 0}%
              </div>
              <div className="text-sm text-blue-700">Success Rate</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">{record.totalRecords}</div>
              <div className="text-sm text-gray-700">Total Records</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Visual Analysis</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Success vs Failure</h3>
              <div className="h-64">
                <Pie data={pieChartData} options={chartOptions} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Summary Breakdown</h3>
              <div className="h-64">
                <Bar data={summaryChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Details */}
        {record.summary && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Detailed Summary</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Products Created:</span>
                  <span className="font-semibold text-gray-900">{record.summary.productsCreated}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Products Updated:</span>
                  <span className="font-semibold text-gray-900">{record.summary.productsUpdated}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Categories Created:</span>
                  <span className="font-semibold text-gray-900">{record.summary.categoriesCreated}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">UOMs Created:</span>
                  <span className="font-semibold text-gray-900">{record.summary.uomsCreated}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {record.errors && record.errors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error Details</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-3">Errors Encountered ({record.errors.length}):</h3>
              <div className="space-y-2">
                {record.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-white p-2 rounded border-l-4 border-red-400">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            This report was generated automatically by the Inventory Management System
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Report ID: {record.id} | Generated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Hidden button to trigger PDF generation */}
      <button
        onClick={generatePDF}
        className="hidden"
        id="generate-pdf-trigger"
      >
        Generate PDF
      </button>
    </div>
  )
}

// Export function to trigger PDF generation from outside
export const triggerPDFGeneration = () => {
  if ((window as any).generatePDFReport) {
    (window as any).generatePDFReport()
  } else {
    console.error('PDF generation function not available')
  }
}

