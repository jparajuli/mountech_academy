import crypto from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import path from "path";
import fs from "fs";

export async function generateCertificatePDF(studentName: string, courseTitle: string, dateStr: string): Promise<Buffer> {
  const certId = "MT-" + crypto.createHash("md5").update(`${studentName}-${courseTitle}`).digest("hex").substring(0, 10).toUpperCase();
  
  const cleanName = studentName.replace(/[()]/g, "");
  const cleanTitle = courseTitle.replace(/[()]/g, "");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);

  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const drawCenteredText = (text: string, size: number, y: number, font: any, color = rgb(0.06, 0.12, 0.22)) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (842 - textWidth) / 2,
      y: y,
      size: size,
      font: font,
      color: color
    });
  };

  // Outer border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderColor: rgb(0.06, 0.09, 0.16),
    borderWidth: 2,
  });

  // Inner border
  page.drawRectangle({
    x: 26,
    y: 26,
    width: 790,
    height: 543,
    borderColor: rgb(0.79, 0.64, 0.25),
    borderWidth: 1,
  });

  // Corner geometric ornament brackets
  const outerLimits = [
    { x: 26, y: 26, dx: 15, dy: 15 },
    { x: 26, y: 569, dx: 15, dy: -15 },
    { x: 816, y: 26, dx: -15, dy: 15 },
    { x: 816, y: 569, dx: -15, dy: -15 }
  ];
  for (const box of outerLimits) {
    page.drawLine({
      start: { x: box.x, y: box.y },
      end: { x: box.x + box.dx, y: box.y },
      color: rgb(0.79, 0.64, 0.25),
      thickness: 1.5
    });
    page.drawLine({
      start: { x: box.x, y: box.y },
      end: { x: box.x, y: box.y + box.dy },
      color: rgb(0.79, 0.64, 0.25),
      thickness: 1.5
    });
  }

  // Logo embedment
  try {
    const logoPath = path.join(process.cwd(), "src", "assets", "images", "mountech_logo_1781293059155.jpg");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);
      const logoDims = logoImage.scaleToFit(140, 52);
      
      page.drawImage(logoImage, {
        x: (842 - logoDims.width) / 2,
        y: 495,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
  } catch (logoErr) {
    console.warn("Could not embed image logo, falling back to typography header.", logoErr);
  }

  drawCenteredText("MOUNTECH ACADEMY", 15, 460, fontHelveticaBold, rgb(0.06, 0.09, 0.16));
  drawCenteredText("GLOBAL LAB PLATFORM FOR DEEP RESEARCH & ENGINE CERTIFICATIONS", 8.5, 442, fontHelvetica, rgb(0.4, 0.45, 0.55));

  page.drawLine({
    start: { x: 340, y: 425 },
    end: { x: 502, y: 425 },
    color: rgb(0.79, 0.64, 0.25),
    thickness: 1
  });

  drawCenteredText("CERTIFICATE OF COMPLETION", 21, 385, fontHelveticaBold, rgb(0.74, 0.58, 0.20));
  drawCenteredText("This is proudly presented to", 12, 345, fontTimesRomanItalic, rgb(0.35, 0.38, 0.45));

  const nameToDraw = cleanName.toUpperCase();
  drawCenteredText(nameToDraw, 26, 302, fontHelveticaBold, rgb(0.06, 0.09, 0.16));

  const nameWidth = fontHelveticaBold.widthOfTextAtSize(nameToDraw, 26);
  const underlinePadding = 25;
  page.drawLine({
    start: { x: (842 - nameWidth) / 2 - underlinePadding, y: 290 },
    end: { x: (842 + nameWidth) / 2 + underlinePadding, y: 290 },
    color: rgb(0.79, 0.64, 0.25),
    thickness: 1.5
  });

  drawCenteredText("for successfully mastering and completing the professional curriculum of", 11.5, 258, fontTimesRomanItalic, rgb(0.35, 0.38, 0.45));
  drawCenteredText(cleanTitle, 16.5, 222, fontHelveticaBold, rgb(0.0, 0.44, 0.85));

  // Signatures date
  const leftCenterX = 210;
  page.drawText("Sarah Sterling", {
    x: leftCenterX - fontTimesRomanItalic.widthOfTextAtSize("Sarah Sterling", 16) / 2,
    y: 132,
    size: 16,
    font: fontTimesRomanItalic,
    color: rgb(0.12, 0.18, 0.28)
  });
  page.drawLine({
    start: { x: leftCenterX - 100, y: 122 },
    end: { x: leftCenterX + 100, y: 122 },
    color: rgb(0.65, 0.70, 0.75),
    thickness: 0.8
  });
  const label1 = "DIRECTOR OF ACADEMIC AFFAIRS";
  page.drawText(label1, {
    x: leftCenterX - fontHelveticaBold.widthOfTextAtSize(label1, 8.5) / 2,
    y: 110,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.40, 0.45, 0.55)
  });
  const dateLabel = `Issued: ${dateStr}`;
  page.drawText(dateLabel, {
    x: leftCenterX - fontHelvetica.widthOfTextAtSize(dateLabel, 9) / 2,
    y: 96,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.45, 0.50, 0.60)
  });

  // Right Block
  const rightCenterX = 632;
  page.drawText("Sterling Vance", {
    x: rightCenterX - fontTimesRomanItalic.widthOfTextAtSize("Sterling Vance", 16) / 2,
    y: 132,
    size: 16,
    font: fontTimesRomanItalic,
    color: rgb(0.12, 0.18, 0.28)
  });
  page.drawLine({
    start: { x: rightCenterX - 100, y: 122 },
    end: { x: rightCenterX + 100, y: 122 },
    color: rgb(0.65, 0.70, 0.75),
    thickness: 0.8
  });
  const label2 = "ACADEMIC REGISTER & CHANCELLOR";
  page.drawText(label2, {
    x: rightCenterX - fontHelveticaBold.widthOfTextAtSize(label2, 8.5) / 2,
    y: 110,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.40, 0.45, 0.55)
  });
  const verifyIdLabel = `ID: ${certId}`;
  page.drawText(verifyIdLabel, {
    x: rightCenterX - fontHelvetica.widthOfTextAtSize(verifyIdLabel, 9) / 2,
    y: 96,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.45, 0.50, 0.60)
  });

  // Seal badge
  const centerSealX = 421;
  const centerSealY = 118;
  page.drawRectangle({
    x: centerSealX - 16,
    y: centerSealY - 48,
    width: 12,
    height: 48,
    color: rgb(0.65, 0.10, 0.15),
  });
  page.drawRectangle({
    x: centerSealX + 4,
    y: centerSealY - 48,
    width: 12,
    height: 48,
    color: rgb(0.65, 0.10, 0.15),
  });
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 28,
    color: rgb(0.85, 0.67, 0.12),
  });
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 24,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 22,
    color: rgb(0.92, 0.76, 0.20),
  });
  const monogram = "M";
  page.drawText(monogram, {
    x: centerSealX - fontHelveticaBold.widthOfTextAtSize(monogram, 15) / 2,
    y: centerSealY - 5,
    size: 15,
    font: fontHelveticaBold,
    color: rgb(0.06, 0.09, 0.16)
  });
  const labelSeal = "VERIFIED SCHOLAR";
  page.drawText(labelSeal, {
    x: centerSealX - fontHelveticaBold.widthOfTextAtSize(labelSeal, 7) / 2,
    y: centerSealY - 42,
    size: 7,
    font: fontHelveticaBold,
    color: rgb(0.85, 0.67, 0.12)
  });

  const authenticityText = "Authenticity dynamically verified via Mountech Global Cryptographic Nodes";
  drawCenteredText(authenticityText, 8, 48, fontHelvetica, rgb(0.45, 0.50, 0.60));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
