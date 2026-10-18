'use client'

import jsPDF from 'jspdf'
import { userResolver } from '@/lib/user-resolver'

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

export const generateSimplePDF = (record: BulkImportRecord) => {
  try {
    console.log('Generating comprehensive professional PDF for record:', record.id)
    
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPosition = 20
    let currentPage = 1

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace: number = 20) => {
      if (yPosition + requiredSpace > pageHeight - 30) {
        pdf.addPage()
        yPosition = 20
        currentPage++
        return true
      }
      return false
    }

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, fontStyle: string = 'normal', color: number[] = [0, 0, 0]) => {
      pdf.setFontSize(fontSize)
      pdf.setFont('helvetica', fontStyle)
      pdf.setTextColor(color[0], color[1], color[2])
      const lines = pdf.splitTextToSize(text, maxWidth)
      pdf.text(lines, x, y)
      return y + (lines.length * fontSize * 0.35) + 5
    }

    // Helper function to add a line
    const addLine = (y: number, color: number[] = [200, 200, 200], thickness: number = 0.5) => {
      pdf.setDrawColor(color[0], color[1], color[2])
      pdf.setLineWidth(thickness)
      pdf.line(20, y, pageWidth - 20, y)
      return y + 10
    }

    // Helper function to add a box/rectangle
    const addBox = (x: number, y: number, width: number, height: number, fillColor: number[] = [240, 240, 240], strokeColor: number[] = [200, 200, 200]) => {
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2])
      pdf.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2])
      pdf.rect(x, y, width, height, 'FD')
    }

    // Helper function to add a table with better formatting
    const addTable = (data: string[][], x: number, y: number, colWidths: number[], headerColor: number[] = [59, 130, 246], maxRows: number = 20) => {
      const rowHeight = 7
      const startY = y
      
      // Header
      addBox(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight + 2, headerColor, headerColor)
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      
      let currentX = x
      data[0].forEach((header, index) => {
        pdf.text(header, currentX + 3, y + 5)
        currentX += colWidths[index]
      })
      
      // Data rows
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      const rowsToShow = Math.min(data.length - 1, maxRows)
      
      for (let i = 1; i <= rowsToShow; i++) {
        y += rowHeight + 1
        if (i % 2 === 0) {
          addBox(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, [248, 250, 252], [230, 230, 230])
        }
        
        currentX = x
        data[i].forEach((cell, index) => {
          const cellText = cell.length > 80 ? cell.substring(0, 80) + '...' : cell
          pdf.text(cellText, currentX + 3, y + 5)
          currentX += colWidths[index]
        })
      }
      
      if (data.length - 1 > maxRows) {
        y += rowHeight + 5
        pdf.setTextColor(100, 100, 100)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'italic')
        pdf.text(`... and ${data.length - 1 - maxRows} more errors (see detailed error analysis below)`, x + 3, y)
        y += 10
      }
      
      return y + rowHeight + 5
    }

    // Helper function to categorize errors
    const categorizeErrors = (errors: string[]) => {
      const categories: { [key: string]: { count: number, examples: string[] } } = {}
      
      errors.forEach(error => {
        let category = 'Other'
        if (error.includes('Invalid UOM')) category = 'Invalid UOM Symbol'
        else if (error.includes('Unique constraint failed on the fields: (`barcode`)')) category = 'Duplicate Barcode'
        else if (error.includes('Product name is required')) category = 'Missing Required Fields'
        else if (error.includes('Invalid `this.prisma.product.create')) category = 'Database Creation Error'
        else if (error.includes('Row')) category = 'Row Validation Error'
        
        if (!categories[category]) {
          categories[category] = { count: 0, examples: [] }
        }
        categories[category].count++
        if (categories[category].examples.length < 3) {
          categories[category].examples.push(error)
        }
      })
      
      return categories
    }

    // Professional Header with Logo Area
    pdf.setFillColor(15, 23, 42) // Dark blue
    pdf.rect(0, 0, pageWidth, 35, 'F')
    
    // Company/System Name
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('INVENTORY MANAGEMENT SYSTEM', 20, 15)
    
    // Report Title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Comprehensive Bulk Import Analysis Report', 20, 25)
    
    // Report ID and Date
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Report ID: ${record.id}`, pageWidth - 80, 15)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 80, 22)
    
    yPosition = 50
    pdf.setTextColor(0, 0, 0)

    // Executive Summary Box
    addBox(20, yPosition, pageWidth - 40, 30, [248, 250, 252], [59, 130, 246])
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EXECUTIVE SUMMARY', 25, yPosition + 8)
    
    const successRate = record.totalRecords > 0 ? Math.round((record.successfulRecords / record.totalRecords) * 100) : 0
    const statusColor = record.status === 'completed' ? [34, 197, 94] : record.status === 'failed' ? [239, 68, 68] : [59, 130, 246]
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(75, 85, 99)
    pdf.text(`File: ${record.originalFileName}`, 25, yPosition + 15)
    pdf.text(`Status: ${record.status.toUpperCase()}`, 25, yPosition + 20)
    pdf.text(`Success Rate: ${successRate}%`, pageWidth - 100, yPosition + 15)
    pdf.text(`Records: ${record.successfulRecords}/${record.totalRecords}`, pageWidth - 100, yPosition + 20)
    
    // Add error summary in executive summary
    if (record.errors && record.errors.length > 0) {
      pdf.setTextColor(239, 68, 68)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Critical Issues: ${record.errors.length} errors detected`, 25, yPosition + 25)
    }
    
    yPosition += 40

    // Import Details Table
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('IMPORT DETAILS', 20, yPosition, pageWidth - 40, 14)
    yPosition += 5

    const importDetailsData = [
      ['Property', 'Value'],
      ['File Name', record.originalFileName],
      ['Status', record.status.toUpperCase()],
      ['Total Records', record.totalRecords.toString()],
      ['Import Date', new Date(record.createdAt).toLocaleString()],
      ['Completed Date', record.completedAt ? new Date(record.completedAt).toLocaleString() : 'N/A'],
      ['Imported By', userResolver.getUserName(record.userId)],
      ['User Email', userResolver.getUserEmail(record.userId)]
    ]

    yPosition = addTable(importDetailsData, 20, yPosition, [60, 120])
    yPosition += 10

    // Statistics Cards
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('PERFORMANCE METRICS', 20, yPosition, pageWidth - 40, 14)
    yPosition += 10

    // Create 4 metric cards
    const cardWidth = (pageWidth - 60) / 4
    const cardHeight = 25
    
    // Successful Records Card
    addBox(20, yPosition, cardWidth, cardHeight, [240, 253, 244], [34, 197, 94])
    pdf.setTextColor(34, 197, 94)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(record.successfulRecords.toString(), 25, yPosition + 12)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text('SUCCESSFUL', 25, yPosition + 18)

    // Failed Records Card
    addBox(25 + cardWidth, yPosition, cardWidth, cardHeight, [254, 242, 242], [239, 68, 68])
    pdf.setTextColor(239, 68, 68)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(record.failedRecords.toString(), 30 + cardWidth, yPosition + 12)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text('FAILED', 30 + cardWidth, yPosition + 18)

    // Success Rate Card
    addBox(30 + cardWidth * 2, yPosition, cardWidth, cardHeight, [239, 246, 255], [59, 130, 246])
    pdf.setTextColor(59, 130, 246)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${successRate}%`, 35 + cardWidth * 2, yPosition + 12)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text('SUCCESS RATE', 35 + cardWidth * 2, yPosition + 18)

    // Total Records Card
    addBox(35 + cardWidth * 3, yPosition, cardWidth, cardHeight, [249, 250, 251], [107, 114, 128])
    pdf.setTextColor(107, 114, 128)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(record.totalRecords.toString(), 40 + cardWidth * 3, yPosition + 12)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text('TOTAL RECORDS', 40 + cardWidth * 3, yPosition + 18)

    yPosition += cardHeight + 15

    // Detailed Summary Table
    if (record.summary) {
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('DETAILED BREAKDOWN', 20, yPosition, pageWidth - 40, 14)
      yPosition += 5

      const summaryData = [
        ['Operation', 'Count'],
        ['Products Created', record.summary.productsCreated.toString()],
        ['Products Updated', record.summary.productsUpdated.toString()],
        ['Categories Created', record.summary.categoriesCreated.toString()],
        ['UOMs Created', record.summary.uomsCreated.toString()]
      ]

      yPosition = addTable(summaryData, 20, yPosition, [80, 40])
      yPosition += 10
    }

    // Comprehensive Error Analysis Section
    if (record.errors && record.errors.length > 0) {
      checkNewPage(50)
      
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('COMPREHENSIVE ERROR ANALYSIS', 20, yPosition, pageWidth - 40, 14)
      yPosition += 5

      // Error summary statistics
      const errorCategories = categorizeErrors(record.errors)
      const totalErrors = record.errors.length
      
      addBox(20, yPosition, pageWidth - 40, 20, [254, 242, 242], [239, 68, 68])
      pdf.setTextColor(239, 68, 68)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`CRITICAL: ${totalErrors} errors detected in ${record.totalRecords} records`, 25, yPosition + 8)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Error Rate: ${Math.round((totalErrors / record.totalRecords) * 100)}%`, 25, yPosition + 15)
      yPosition += 25

      // Error categories breakdown
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('ERROR CATEGORIES BREAKDOWN', 20, yPosition, pageWidth - 40, 12)
      yPosition += 5

      const categoryData = [['Error Type', 'Count', 'Percentage', 'Examples']]
      Object.entries(errorCategories).forEach(([category, data]) => {
        const percentage = Math.round((data.count / totalErrors) * 100)
        const example = data.examples[0] ? data.examples[0].substring(0, 40) + '...' : 'N/A'
        categoryData.push([category, data.count.toString(), `${percentage}%`, example])
      })

      yPosition = addTable(categoryData, 20, yPosition, [50, 20, 20, 80])
      yPosition += 15

      // Detailed error list with better formatting
      checkNewPage(100)
      
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('DETAILED ERROR LIST', 20, yPosition, pageWidth - 40, 12)
      yPosition += 5

      // Show first 30 errors in detail
      const errorsToShow = record.errors.slice(0, 30)
      const errorData = [['Row #', 'Error Type', 'Error Description']]
      
      errorsToShow.forEach((error, index) => {
        let errorType = 'Unknown'
        if (error.includes('Invalid UOM')) errorType = 'UOM Error'
        else if (error.includes('Unique constraint failed on the fields: (`barcode`)')) errorType = 'Duplicate Barcode'
        else if (error.includes('Product name is required')) errorType = 'Missing Field'
        else if (error.includes('Invalid `this.prisma.product.create')) errorType = 'DB Error'
        else if (error.includes('Row')) errorType = 'Validation Error'
        
        const rowNumber = error.match(/Row (\d+):/)?.[1] || (index + 2).toString()
        const cleanError = error.replace(/Row \d+:\s*/, '').substring(0, 100)
        
        errorData.push([rowNumber, errorType, cleanError])
      })

      yPosition = addTable(errorData, 20, yPosition, [20, 30, 120])
      
      if (record.errors.length > 30) {
        yPosition += 10
        pdf.setTextColor(100, 100, 100)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'italic')
        pdf.text(`... and ${record.errors.length - 30} more errors (see complete error log below)`, 20, yPosition)
        yPosition += 15
      }

      // Complete error log on new page
      if (record.errors.length > 30) {
        checkNewPage(50)
        
        pdf.setTextColor(15, 23, 42)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        yPosition = addText('COMPLETE ERROR LOG', 20, yPosition, pageWidth - 40, 12)
        yPosition += 5

        pdf.setTextColor(75, 85, 99)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        
        record.errors.forEach((error, index) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage()
            yPosition = 20
            currentPage++
          }
          
          const rowNumber = error.match(/Row (\d+):/)?.[1] || (index + 2).toString()
          pdf.setTextColor(15, 23, 42)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`Row ${rowNumber}:`, 20, yPosition)
          
          pdf.setTextColor(75, 85, 99)
          pdf.setFont('helvetica', 'normal')
          const cleanError = error.replace(/Row \d+:\s*/, '')
          const errorLines = pdf.splitTextToSize(cleanError, pageWidth - 60)
          pdf.text(errorLines, 40, yPosition)
          
          yPosition += (errorLines.length * 3) + 5
        })
      }
    }

    // Performance Chart (ASCII-style visualization)
    checkNewPage(50)
    
    pdf.setTextColor(15, 23, 42)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('SUCCESS RATE VISUALIZATION', 20, yPosition, pageWidth - 40, 14)
    yPosition += 5

    // Create a simple bar chart representation
    const barWidth = 100
    const barHeight = 15
    const successBarWidth = (successRate / 100) * barWidth
    
    // Background bar
    addBox(20, yPosition, barWidth, barHeight, [229, 231, 235], [156, 163, 175])
    // Success bar
    addBox(20, yPosition, successBarWidth, barHeight, [34, 197, 94], [34, 197, 94])
    
    // Labels
    pdf.setTextColor(75, 85, 99)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${successRate}%`, 125, yPosition + 10)
    pdf.text('Success Rate', 20, yPosition + 25)

    yPosition += 35

    // Recommendations section
    if (record.errors && record.errors.length > 0) {
      checkNewPage(50)
      
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('RECOMMENDATIONS', 20, yPosition, pageWidth - 40, 14)
      yPosition += 5

      const recommendations = [
        "1. Review and fix UOM symbols in your import file",
        "2. Ensure all barcodes are unique across products",
        "3. Verify all required fields are filled (name, UOM, etc.)",
        "4. Check data format and validation rules",
        "5. Consider importing in smaller batches to identify issues",
        "6. Use the template provided for consistent data format"
      ]

      recommendations.forEach(rec => {
        pdf.setTextColor(75, 85, 99)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        yPosition = addText(rec, 20, yPosition, pageWidth - 40, 10)
      })
      
      yPosition += 10
    }

    // Footer
    checkNewPage(30)
    
    // Professional footer
    addLine(yPosition, [229, 231, 235], 1)
    yPosition += 5
    
    pdf.setTextColor(107, 114, 128)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This comprehensive report was generated automatically by the Inventory Management System', 20, yPosition)
    pdf.text(`Report ID: ${record.id} | Generated: ${new Date().toLocaleString()} | Page ${currentPage}`, 20, yPosition + 5)
    pdf.text('© 2024 Inventory Management System. All rights reserved.', pageWidth - 120, yPosition + 5)

    // Save the PDF
    const fileName = `bulk-import-report-${record.id}.pdf`
    pdf.save(fileName)
    
    console.log('Simple PDF generated successfully:', fileName)
    return true
  } catch (error) {
    console.error('Error generating simple PDF:', error)
    alert('Error generating PDF. Please try again.')
    return false
  }
}
