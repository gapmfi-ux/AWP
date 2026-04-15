// Updated print.js file

// Improved font sizes, spacing, and design adjustments while maintaining functionality

function printContent() {
    const content = document.getElementById('content');
    const printWindow = window.open('', '', 'width=800,height=600');

    // Applying styles for printing
    printWindow.document.write('<html><head><style>');
    printWindow.document.write('body { font-size: 16px; line-height: 1.5; margin: 20px; }');
    printWindow.document.write('h1 { font-size: 24px; margin-bottom: 20px; }');
    printWindow.document.write('p { font-size: 14px; margin-bottom: 15px; }');
    printWindow.document.write('@media print {');
    printWindow.document.write('page { size: A4; margin: 0; }');
    printWindow.document.write('}') 
    printWindow.document.write('</style></head><body>');

    printWindow.document.write(content.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// Event listener for print button
document.getElementById('printButton').addEventListener('click', printContent);