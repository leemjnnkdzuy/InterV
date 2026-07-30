import nodemailer from "nodemailer";
import crypto from "crypto";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.SMTP_DRY_RUN === "true"
  ) {
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
    return transporter;
  }
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS are required");
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transporter;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
      })[character] || character
  );
}

export function generatePIN(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function getVerificationEmailTemplate(pin: string, userName: string): string {
  const safePin = escapeHtml(pin);
  const safeUserName = escapeHtml(userName);
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
                Xin chào <strong>${safeUserName}</strong>,
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
                <p style="margin: 0; font-size: 38px; font-weight: 800; color: #bbf451; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; padding-left: 12px;">${safePin}</p>
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
  const safePin = escapeHtml(pin);
  const safeUserEmail = escapeHtml(userEmail);
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
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong style="color: #ffffff;">${safeUserEmail}</strong>. Vui lòng sử dụng mã OTP dưới đây để tiến hành thay đổi mật khẩu của bạn:
              </p>
            </td>
          </tr>
          <!-- OTP Box -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #09090b; border: 1px dashed rgba(187, 244, 81, 0.35); border-radius: 12px; padding: 26px 20px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">MÃ KHÔI PHỤC OTP</p>
                <p style="margin: 0; font-size: 38px; font-weight: 800; color: #bbf451; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; padding-left: 12px;">${safePin}</p>
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
    await getTransporter().sendMail({
      from: `"InterV" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Xác thực tài khoản - InterV",
      html: getVerificationEmailTemplate(pin, userName),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Error sending verification email:", error);
    return { success: false, error: getUnknownErrorMessage(error) };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getTransporter().sendMail({
      from: `"InterV" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Đặt lại mật khẩu - InterV",
      html: getPasswordResetEmailTemplate(pin, email),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: getUnknownErrorMessage(error) };
  }
}

export function getChangeEmailTemplate(pin: string, purpose: "current" | "new"): string {
  const title = purpose === "current" ? "Xác nhận đổi email tài khoản" : "Xác nhận email mới của bạn";
  const desc = purpose === "current" 
    ? "Chúng tôi nhận được yêu cầu đổi địa chỉ email của bạn. Vui lòng sử dụng mã xác thực dưới đây để xác thực email hiện tại của bạn:" 
    : "Đây là mã xác thực để kích hoạt địa chỉ email mới này cho tài khoản của bạn:";
  const safePin = escapeHtml(pin);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - InterV</title>
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
                ${title}
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                ${desc}
              </p>
            </td>
          </tr>
          <!-- OTP Box -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #09090b; border: 1px dashed rgba(187, 244, 81, 0.35); border-radius: 12px; padding: 26px 20px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">MÃ XÁC THỰC OTP</p>
                <p style="margin: 0; font-size: 38px; font-weight: 800; color: #bbf451; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; padding-left: 12px;">${safePin}</p>
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

export async function sendChangeEmailPin(
  email: string,
  pin: string,
  purpose: "current" | "new"
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = purpose === "current" ? "Xác nhận đổi email tài khoản - InterV" : "Xác nhận địa chỉ email mới - InterV";
    await getTransporter().sendMail({
      from: `"InterV" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: getChangeEmailTemplate(pin, purpose),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Error sending change email OTP:", error);
    return { success: false, error: getUnknownErrorMessage(error) };
  }
}

export function getRecruitmentInvitationTemplate(input: {
  candidateName: string;
  recruiterName: string;
  campaignTitle: string;
  jobTitle: string;
  interviewUrl: string;
  startsAt?: Date;
  endsAt: Date;
  invitationMessage?: string;
}): string {
  const candidateName = escapeHtml(input.candidateName);
  const recruiterName = escapeHtml(input.recruiterName);
  const campaignTitle = escapeHtml(input.campaignTitle);
  const jobTitle = escapeHtml(input.jobTitle);
  const interviewUrl = escapeHtml(input.interviewUrl);
  const invitationMessage = input.invitationMessage
    ? `<p style="margin: 16px 0 0; padding: 14px; border-left: 3px solid #bbf451; background: #18181b; color: #d4d4d8; line-height: 1.6;">${escapeHtml(
        input.invitationMessage
      )}</p>`
    : "";
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const startsAt = input.startsAt
    ? dateFormatter.format(input.startsAt)
    : "Có thể bắt đầu ngay";
  const endsAt = dateFormatter.format(input.endsAt);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thư mời phỏng vấn - InterV</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Arial,sans-serif;color:#f4f4f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#09090b;">
    <tr>
      <td align="center" style="padding:40px 12px;">
        <table role="presentation" style="width:100%;max-width:560px;border-collapse:collapse;background:#121214;border:1px solid #27272a;border-radius:8px;">
          <tr>
            <td style="padding:32px 36px 18px;">
              <div style="font-size:26px;font-weight:800;color:#fff;">InterV<span style="color:#bbf451;">.</span></div>
              <p style="margin:24px 0 8px;color:#a1a1aa;font-size:13px;text-transform:uppercase;">Thư mời phỏng vấn trực tuyến</p>
              <h1 style="margin:0;color:#fff;font-size:24px;line-height:1.35;">${campaignTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="color:#d4d4d8;line-height:1.7;">Xin chào <strong style="color:#fff;">${candidateName}</strong>,</p>
              <p style="color:#a1a1aa;line-height:1.7;"><strong style="color:#f4f4f5;">${recruiterName}</strong> đã mời bạn tham gia phỏng vấn AI cho vị trí <strong style="color:#bbf451;">${jobTitle}</strong>.</p>
              ${invitationMessage}
              <table role="presentation" style="width:100%;margin:22px 0;border-collapse:collapse;background:#18181b;border:1px solid #27272a;border-radius:8px;">
                <tr><td style="padding:14px 16px;color:#71717a;font-size:13px;">Bắt đầu</td><td style="padding:14px 16px;text-align:right;color:#f4f4f5;font-size:13px;">${escapeHtml(startsAt)}</td></tr>
                <tr><td style="padding:14px 16px;color:#71717a;font-size:13px;border-top:1px solid #27272a;">Hạn hoàn thành</td><td style="padding:14px 16px;text-align:right;color:#f4f4f5;font-size:13px;border-top:1px solid #27272a;">${escapeHtml(endsAt)}</td></tr>
              </table>
              <a href="${interviewUrl}" style="display:block;padding:14px 20px;background:#bbf451;color:#18181b;text-align:center;text-decoration:none;font-weight:800;border-radius:8px;">Mở buổi phỏng vấn</a>
              <p style="margin:18px 0 0;color:#71717a;font-size:12px;line-height:1.6;">Bạn cần đăng nhập đúng tài khoản nhận thư này. Liên kết không yêu cầu cung cấp mật khẩu qua email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendRecruitmentInvitationEmail(input: {
  email: string;
  candidateName: string;
  recruiterName: string;
  campaignTitle: string;
  jobTitle: string;
  interviewUrl: string;
  startsAt?: Date;
  endsAt: Date;
  invitationMessage?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await getTransporter().sendMail({
      from: `"InterV Tuyển dụng" <${process.env.SMTP_USER}>`,
      to: input.email,
      subject: `Thư mời phỏng vấn: ${input.jobTitle}`.slice(0, 160),
      html: getRecruitmentInvitationTemplate(input),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Recruitment invitation delivery failed:", error);
    return { success: false, error: getUnknownErrorMessage(error) };
  }
}
