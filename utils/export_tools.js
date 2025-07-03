const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const PDFDocument = require('pdfkit');
const path = require('path');

async function exportCSV(data) {
    const filePath = path.join(__dirname, '../gastos.csv');
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'descricao', title: 'Descrição' },
            { id: 'valor', title: 'Valor' },
            { id: 'categoria', title: 'Categoria' },
            { id: 'tipoTransacao', title: 'Tipo' },
            { id: 'timestamp', title: 'Data' }
        ]
    });
    await csvWriter.writeRecords(data);
    return filePath;
}

async function exportPDF(data) {
    const filePath = path.join(__dirname, '../gastos.pdf');
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(16).text('Relatório de Gastos PoupaMAIS.ai', { align: 'center' });
    doc.moveDown();
    data.forEach(d => {
        doc.fontSize(12).text(
            `${d.descricao} | R$ ${d.valor.toFixed(2)} | ${d.categoria} | ${d.tipoTransacao} | ${new Date(d.timestamp).toLocaleString()}`
        );
    });
    doc.end();
    return filePath;
}

module.exports = { exportCSV, exportPDF };
