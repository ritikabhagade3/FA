import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface CertificateData {
  userName: string;
  courseName?: string;
  quizTitle?: string;
  type: 'course' | 'quiz';
  completionDate: Date;
  score?: number;
  totalQuestions?: number;
  badge?: string;
}

// Generate certificate as PDF
export const generateCertificatePDF = async (data: CertificateData): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 210], // A4 landscape
  });

  // Title
  doc.setFontSize(36);
  doc.setTextColor(41, 98, 255); // Blue
  doc.text('Certificate of Completion', 148.5, 50, { align: 'center' });

  // Decorative line
  doc.setDrawColor(41, 98, 255);
  doc.setLineWidth(1);
  doc.line(50, 60, 247, 60);

  // This is to certify that
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('This is to certify that', 148.5, 80, { align: 'center' });

  // Name
  doc.setFontSize(28);
  doc.setTextColor(138, 43, 226); // Purple
  doc.setFont('helvetica', 'bold');
  doc.text(data.userName, 148.5, 100, { align: 'center' });

  // Completion text
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  if (data.type === 'course') {
    doc.text('has successfully completed the course', 148.5, 120, { align: 'center' });
    doc.setFontSize(20);
    doc.setTextColor(41, 98, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(data.courseName || 'Course', 148.5, 140, { align: 'center' });
  } else {
    doc.text('has successfully completed the quiz', 148.5, 120, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(data.quizTitle || 'AI Generated Quiz', 148.5, 140, { align: 'center' });
    if (data.score !== undefined && data.totalQuestions !== undefined) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      const percentage = ((data.score / data.totalQuestions) * 100).toFixed(0);
      doc.text(`Score: ${data.score}/${data.totalQuestions} (${percentage}%)`, 148.5, 155, { align: 'center' });
    }
  }

  // Date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const dateStr = data.completionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Completed on: ${dateStr}`, 148.5, 175, { align: 'center' });

  // Badge if available
  if (data.badge) {
    doc.setFontSize(12);
    doc.setTextColor(255, 193, 7); // Gold
    doc.text(data.badge, 148.5, 190, { align: 'center' });
  }

  // Certificate ID
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const certId = `CERT-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Certificate ID: ${certId}`, 148.5, 200, { align: 'center' });

  // Save
  doc.save(`certificate-${data.userName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
};

// Generate certificate from HTML element
export const generateCertificateFromHTML = async (
  elementId: string,
  filename: string = 'certificate'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Certificate element not found');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 210],
  });

  const imgWidth = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(`${filename}-${Date.now()}.pdf`);
};

