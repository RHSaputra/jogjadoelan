import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

async function testSend() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "Jogjadoelan";
  
  if (!apiKey) {
    console.error("Missing RESEND_API_KEY");
    return;
  }
  
  const resend = new Resend(apiKey);
  
  // Send to the owner/admin email
  const toEmail = "jogjadoelantechforlocal.id@gmail.com";
  
  console.log(`Attempting to send test email to admin ${toEmail} from "${fromName} <${fromEmail}>"`);
  
  try {
    const response = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: "Test Audit Resend Admin - Jogjadoelan",
      html: "<h3>Audit Resend</h3><p>Ini adalah email uji coba untuk memverifikasi integrasi Resend Email ke admin.</p>"
    });
    
    console.log("Resend API response:", response);
  } catch (error) {
    console.error("Exception during email send:", error);
  }
}

testSend();
