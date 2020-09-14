"use strict";
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const signupPDF = async (content, user, client) => {
  try {
    const pdfPath = path.join(
      "/app",
      "client",
      `c${user.client_id}_u${user.id}_contract` + ".pdf"
    );
    const pdfDoc = new PDFDocument({ size: "A4", margin: 50 });
    pdfDoc.text(content);

    pdfDoc.text(`Signed: ${user.sign_dt}`, 50, pdfDoc.page.height - 160, {
      width: 410,
      align: "left",
    });
    pdfDoc.text(`Name: ${user.firstname} ${user.lastname}`);
    pdfDoc.text(`IP Address: ${user.sign_ip_address}`);
    pdfDoc.text(`Practice: ${client.name}`);
    pdfDoc.text(`UserID: ${user.id}`);

    pdfDoc.end();
    const writeStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(writeStream);

    return pdfPath;
  } catch (error) {
    console.error("pdfDoc >>>:", error);
    return false;
  }
};

const user = {
  signupPDF,
};

module.exports = user;