import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'vivekvarma8844@gmail.com';
const smtpPass = process.env.SMTP_PASS || 'rdohhbhwrafdirqb';
const fromName = process.env.SMTP_FROM_NAME || 'ride-share';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export class MailService {
  /**
   * Sends the unique Boarding OTP to the passenger once their request is approved
   */
  static async sendBookingOtpEmail(params: {
    to: string;
    passengerName: string;
    origin: string;
    destination: string;
    departureTime: string;
    otp: string;
    driverName: string;
    vehicleInfo: string;
  }): Promise<boolean> {
    const { to, passengerName, origin, destination, departureTime, otp, driverName, vehicleInfo } = params;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; }
          .content { padding: 28px 24px; }
          .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #166534; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #15803d; margin: 8px 0; font-family: monospace; }
          .otp-sub { font-size: 12px; color: #166534; opacity: 0.8; }
          .details { background: #f8fafc; border-radius: 14px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .detail-row:last-child { margin-bottom: 0; }
          .label { color: #64748b; font-weight: 600; }
          .val { color: #0f172a; font-weight: 700; text-align: right; }
          .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Ride Boarding Pass</h1>
            <p>${fromName} • Booking Confirmed</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; margin-top: 0;">Hello <strong>${passengerName}</strong>,</p>
            <p style="font-size: 13px; color: #475569; line-height: 1.5;">Your ride request has been approved! Give this unique OTP to your driver before boarding your vehicle.</p>
            
            <div class="otp-box">
              <div class="otp-label">Your Unique Boarding OTP</div>
              <div class="otp-code">${otp}</div>
              <div class="otp-sub">Share this with your driver only when entering the car</div>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="label">Route:</span>
                <span class="val">${origin} &rarr; ${destination}</span>
              </div>
              <div class="detail-row">
                <span class="label">Departure:</span>
                <span class="val">${departureTime}</span>
              </div>
              <div class="detail-row">
                <span class="label">Driver:</span>
                <span class="val">${driverName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vehicle:</span>
                <span class="val">${vehicleInfo}</span>
              </div>
            </div>

            <p style="font-size: 12px; color: #64748b; text-align: center; margin: 15px 0 0;">
              Please be at the pickup location 5 minutes before scheduled departure time.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${fromName} Network. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to,
        subject: `[${fromName}] Your Boarding OTP is ${otp} for ride to ${destination}`,
        html: htmlContent,
      });
      console.log(`[MailService] Boarding OTP email dispatched successfully to ${to}`);
      return true;
    } catch (err: any) {
      console.warn(`[MailService] Failed to dispatch OTP email to ${to}:`, err.message);
      return false;
    }
  }

  /**
   * Notifies passengers when the driver starts the trip
   */
  static async sendRideStartedEmail(params: {
    to: string;
    passengerName: string;
    origin: string;
    destination: string;
    driverName: string;
    rideId: string;
  }): Promise<boolean> {
    const { to, passengerName, origin, destination, driverName, rideId } = params;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="color: #4f46e5; margin-top: 0;">Your Ride has Officially Started!</h2>
          <p>Hello <strong>${passengerName}</strong>,</p>
          <p>Your driver <strong>${driverName}</strong> has verified passenger boarding and commenced the trip from <strong>${origin}</strong> towards <strong>${destination}</strong>.</p>
          <div style="background: #eef2ff; border-radius: 12px; padding: 14px; margin: 18px 0; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #3730a3; font-weight: 600;">You can view the live trip route and driver updates on your RouteMate dashboard.</p>
          </div>
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Safe travels with ${fromName}!</p>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to,
        subject: `[${fromName}] Your ride to ${destination} has started!`,
        html: htmlContent,
      });
      return true;
    } catch (err: any) {
      console.warn(`[MailService] Failed to dispatch ride started email:`, err.message);
      return false;
    }
  }
}
