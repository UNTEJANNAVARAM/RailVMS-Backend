const PDFDocument = require('pdfkit');

async function generateApplicationPDF(res, applicationData) {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${applicationData.application_number}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(18).text("RailVMS Application Form", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Application Number: ${applicationData.application_number}`);
  doc.text(`Application Type: ${applicationData.application_type}`);
  doc.text(`Status: ${applicationData.status}`);
  doc.moveDown();

  doc.text("Authorized Person Details:");
  doc.text(`Name: ${applicationData.authorized_name}`);
  doc.text(`Phone: ${applicationData.authorized_phone}`);
  doc.text(`Address: ${applicationData.authorized_address}`);
  doc.moveDown();

  doc.text("Identification Details:");
  doc.text(`PAN: ${applicationData.pan_no}`);
  doc.text(`GST: ${applicationData.gst_no}`);
  doc.text(`Aadhar: ${applicationData.aadhar_no}`);
  doc.moveDown();

  doc.text("Shop Details:");
  doc.text(`Station: ${applicationData.station_name}`);
  doc.text(`Platform No: ${applicationData.platform_no}`);
  doc.text(`Shop Size (sqft): ${applicationData.shop_size_sqft}`);
  doc.text(`Shop Category: ${applicationData.shop_category}`);
  doc.moveDown();

  doc.text(`Applied Date: ${applicationData.applied_at}`);

  doc.end();
}

module.exports = generateApplicationPDF;