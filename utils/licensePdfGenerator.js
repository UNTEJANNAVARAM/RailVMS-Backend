const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateLicensePDF(res, licenseData) {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${licenseData.license_number}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(18).text("RailVMS License Certificate");
  doc.moveDown();
  doc.text(`License No: ${licenseData.license_number}`);
  doc.text(`Valid Upto: ${licenseData.valid_to}`);
  doc.moveDown();

  const qrData = `http://localhost:5000/api/public/license/${licenseData.license_number}`;
  const qrImage = await QRCode.toDataURL(qrData);

  const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
  doc.image(Buffer.from(base64Data, 'base64'), { width: 100 });

  doc.end();
}

module.exports = generateLicensePDF;