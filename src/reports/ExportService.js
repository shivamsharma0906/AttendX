import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (headers, dataRows, title) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.autoTable({
    startY: 30,
    head: [headers],
    body: dataRows,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] }, // Tailwind purple-500
  });
  
  doc.save(`${title}.pdf`);
};
