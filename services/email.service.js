const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // hoặc SMTP khác
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOTPEmail = async (email, otpCode) => {
    await transporter.sendMail({
      from: `"The Chill Cup" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🌟 Mã xác nhận đăng ký của bạn (OTP) - The Chill Cup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 30px; background-color: #f9f9f9;">
          <div style="text-align: center;">
            <img src="https://res.cloudinary.com/dgyb5zpqr/image/upload/v1751275465/splash-logo5_jtqk7w.png" alt="The Chill Cup" width="100" style="margin-bottom: 20px;" />
            <h2 style="color: #6b4f4f;">Xác minh tài khoản của bạn</h2>
          </div>
          <p style="font-size: 16px; color: #333;">
            Cảm ơn bạn đã đăng ký tài khoản tại <strong>The Chill Cup</strong>. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP bên dưới:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; letter-spacing: 5px; background-color: #fff3cd; padding: 15px 25px; border-radius: 10px; display: inline-block; color: #856404; font-weight: bold;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 14px; color: #555;">
            Mã này có hiệu lực trong vòng <strong>5 phút</strong>. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
          </p>
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #ccc;" />
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            © 2025 The Chill Cup. All rights reserved.<br/>
            Nếu bạn cần hỗ trợ, hãy liên hệ với chúng tôi qua email: dinhquochuy.2004hl@gmail.com
          </p>
        </div>
      `
    });
  };
  
// Gửi email OTP đặt lại mật khẩu
exports.sendResetPasswordEmail = async (email, otpCode) => {
  await transporter.sendMail({
    from: `"The Chill Cup" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Mã đặt lại mật khẩu của bạn (OTP) - The Chill Cup',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 30px; background-color: #f9f9f9;">
        <div style="text-align: center;">
          <img src="https://res.cloudinary.com/dgyb5zpqr/image/upload/v1751275465/splash-logo5_jtqk7w.png" alt="The Chill Cup" width="100" style="margin-bottom: 20px;" />
          <h2 style="color: #6b4f4f;">Đặt lại mật khẩu của bạn</h2>
        </div>
        <p style="font-size: 16px; color: #333;">
          Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>The Chill Cup</strong>. Vui lòng sử dụng mã OTP bên dưới để đặt lại mật khẩu:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; letter-spacing: 5px; background-color: #fff3cd; padding: 15px 25px; border-radius: 10px; display: inline-block; color: #856404; font-weight: bold;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 14px; color: #555;">
          Mã này có hiệu lực trong vòng <strong>5 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi nếu bạn nghĩ tài khoản của mình đang bị xâm phạm.
        </p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #ccc;" />
        <p style="font-size: 12px; color: #aaa; text-align: center;">
          © 2025 The Chill Cup. All rights reserved.<br/>
          Nếu bạn cần hỗ trợ, hãy liên hệ với chúng tôi qua email: dinhquochuy.2004hl@gmail.com
        </p>
      </div>
    `
  });
};
  