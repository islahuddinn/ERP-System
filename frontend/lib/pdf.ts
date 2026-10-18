import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Add type definition for autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF
    }
}

interface ReportColumn {
    header: string
    dataKey: string
}

export const generatePDF = (title: string, columns: ReportColumn[], data: any[], filename: string) => {
    const doc = new jsPDF()

    // Add Title
    doc.setFontSize(18)
    doc.text(title, 14, 22)

    // Add Date
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

    // Generate Table
    doc.autoTable({
        startY: 40,
        head: [columns.map(col => col.header)],
        body: data.map(row => columns.map(col => row[col.dataKey])),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }, // Blue header
    })

    // Save
    doc.save(`${filename}.pdf`)
}
