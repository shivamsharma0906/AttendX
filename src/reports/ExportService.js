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

/**
 * Generates an official, beautifully formatted per-employee Payslip PDF.
 */
export const exportEmployeePayslipPDF = (employee, salaryData = {}, monthYear = 'Current Month') => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('AttendX — Salary Payslip', 14, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${monthYear}`, 150, 25);

  // Employee Information
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, 52);

  const empDetails = [
    ['Employee Name:', employee.name || 'N/A', 'Employee ID:', employee.id || employee.employeeId || 'N/A'],
    ['Designation:', employee.role || 'Staff', 'Joining Date:', employee.joinDate || 'N/A'],
    ['Base Monthly Salary:', `$${(employee.baseSalary || 0).toLocaleString()}`, 'Payment Status:', 'Generated'],
  ];

  doc.autoTable({
    startY: 56,
    body: empDetails,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 55 },
    },
  });

  // Salary Breakdown Table
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings & Attendance Summary', 14, finalY);

  const breakdownRows = [
    ['Base Salary', `$${(employee.baseSalary || 0).toLocaleString()}`],
    ['Hours Worked', `${salaryData.workedHrs || 0} hrs`],
    ['Target Monthly Hours', `${salaryData.targetHrs || 160} hrs`],
    ['Approved Paid Leave Days', `${salaryData.leaveDays || 0} days`],
    ['Late Arrivals', `${salaryData.lateCount || 0}`],
    ['Calculated Net Salary', `$${(salaryData.finalSalary || employee.baseSalary || 0).toLocaleString()}`],
  ];

  doc.autoTable({
    startY: finalY + 4,
    head: [['Description', 'Amount / Value']],
    body: breakdownRows,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // Footer / Verification Notice
  const footerY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated payslip issued by AttendX. No signature required.', 14, footerY);

  doc.save(`Payslip_${employee.name || 'Employee'}_${monthYear.replace(' ', '_')}.pdf`);
};
