'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'react-hot-toast'
import { useBulkImport } from '@/hooks/useProducts'

export default function BulkImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const bulkImportMutation = useBulkImport()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      // Validate file type
      const validTypes = ['.csv', '.xls', '.xlsx']
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
      if (!validTypes.includes(fileExtension)) {
        toast.error('Please select a CSV, XLS, or XLSX file')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      await bulkImportMutation.mutateAsync(file)
      setFile(null) // Clear file after successful upload
    } catch (error) {
      console.error('Upload failed', error)
      // Error handling is done by the hook
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/products')}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Bulk Import</h2>
          <p className="text-gray-500">Upload CSV or Excel files to import multiple products at once.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Select a CSV file containing product data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">CSV, XLS, or XLSX (MAX. 10MB)</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">{file.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                  onClick={() => { setFile(null); }}
                >
                  <span className="sr-only">Remove</span>
                  &times;
                </Button>
              </div>
            )}

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={!file || bulkImportMutation.isPending}
              onClick={handleUpload}
            >
              {bulkImportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : bulkImportMutation.isSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Uploaded
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>

            {bulkImportMutation.isSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your file has been uploaded and is being processed in the background. Check Import History for status.
                </AlertDescription>
              </Alert>
            )}

            {bulkImportMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  There was an error uploading your file. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Follow these guidelines for a successful import.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-900">Required Columns:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Product Code (Unique)</li>
                <li>Product Name</li>
                <li>Category Code</li>
                <li>UOM</li>
                <li>Unit Cost</li>
                <li>Selling Price</li>
              </ul>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-900">Notes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verify Category codes exist before import.</li>
                <li>Stock levels are set to 0 by default.</li>
                <li>Maximum 1000 rows per file.</li>
              </ul>
            </div>
            <div className="pt-4">
              <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                <FileText className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
