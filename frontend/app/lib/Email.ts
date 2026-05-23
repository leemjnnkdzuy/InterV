import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generatePIN(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

export function getVerificationEmailTemplate(pin: string, userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực tài khoản - InterV</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #121214; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Merriweather Sans', 'Segoe UI', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                InterV<span style="color: #bbf451;">.</span>
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 0 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #ffffff; text-align: center;">
                Xác thực tài khoản đăng ký
              </h2>
              <p style="margin: 0 0 8px; font-size: 15px; color: #f4f4f5; font-weight: 500;">
                Xin chào <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký tài khoản tại InterV. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất việc đăng ký:
              </p>
            </td>
          </tr>
          <!-- OTP Box -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #09090b; border: 1px dashed rgba(187, 244, 81, 0.35); border-radius: 12px; padding: 26px 20px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">MÃ XÁC THỰC OTP</p>
                <p style="margin: 0; font-size: 38px; font-weight: 800; color: #bbf451; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; padding-left: 12px;">${pin}</p>
              </div>
            </td>
          </tr>
          <!-- Expire Notice -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5; text-align: center;">
                Mã OTP này có giá trị trong vòng <strong style="color: #a1a1aa;">10 phút</strong>.<br>
                Nếu bạn không thực hiện yêu cầu này, bạn có thể an tâm bỏ qua email này.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #18181b; border-radius: 0 0 16px 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                © 2026 InterV. Nền tảng luyện phỏng vấn AI thông minh.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getPasswordResetEmailTemplate(pin: string, userEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu - InterV</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #121214; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Merriweather Sans', 'Segoe UI', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                InterV<span style="color: #bbf451;">.</span>
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 0 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #ffffff; text-align: center;">
                Yêu cầu khôi phục mật khẩu
              </h2>
              <p style="margin: 0 0 8px; font-size: 15px; color: #f4f4f5; font-weight: 500;">
                Xin chào,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong style="color: #ffffff;">${userEmail}</strong>. Vui lòng sử dụng mã OTP dưới đây để tiến hành thay đổi mật khẩu của bạn:
              </p>
            </td>
          </tr>
          <!-- OTP Box -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #09090b; border: 1px dashed rgba(187, 244, 81, 0.35); border-radius: 12px; padding: 26px 20px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">MÃ KHÔI PHỤC OTP</p>
                <p style="margin: 0; font-size: 38px; font-weight: 800; color: #bbf451; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; padding-left: 12px;">${pin}</p>
              </div>
            </td>
          </tr>
          <!-- Expire Notice -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5; text-align: center;">
                Mã khôi phục này có hiệu lực trong vòng <strong style="color: #a1a1aa;">10 phút</strong>.<br>
                Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này để bảo vệ tài khoản của bạn.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #18181b; border-radius: 0 0 16px 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                © 2026 InterV. Nền tảng luyện phỏng vấn AI thông minh.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  email: string,
  pin: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      from: `"InterV" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Xác thực tài khoản - InterV",
      html: getVerificationEmailTemplate(pin, userName),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      from: `"InterV" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Đặt lại mật khẩu - InterV",
      html: getPasswordResetEmailTemplate(pin, email),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error.message };
  }
}
