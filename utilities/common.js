const httpStatus = require("http-status-codes");
const connection = require("../config/database");
const code = require("./request-error-code");
const message = require("../languages/en");
const constant = require("../config/constant");
const cryptLib = require("cryptlib");
const lodash = require("lodash");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const PDFDocument = require('pdfkit');

require("dotenv").config();
const jwt = require("jsonwebtoken");





class Utility {
  generateJwt(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  }

  verifyJwt(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  generateOtp() {
    // generate otp of 4 digit
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  generateAutoName() {
    const adjectives = [
      "Quick",
      "Bright",
      "Happy",
      "Clever",
      "Brave",
      "Calm",
      "Sharp",
      "Bold",
    ];
    const nouns = [
      "Tiger",
      "Eagle",
      "Lion",
      "Panther",
      "Wolf",
      "Falcon",
      "Bear",
      "Hawk",
    ];

    // Generate random indices for adjectives and nouns
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    // Generate a random number between 1000 and 9999
    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    // Combine the parts to form the name
    return `${randomAdjective}${randomNoun}${randomNumber}`;
  }

  // Example usage

  response(res, message, status_code = httpStatus.OK) {
    // console.log("Incoming Message:", message);

    // Extract message text
    let messageText = message.messages || "operation_failed"; // Default message if missing

    // getMessage(req.lang, { keyword: messageText }, (translated_message) => {
    //     console.log(req.lang,translated_message)
    //     res.status(status_code).send({
    //         code: message.code || status_code, // Use provided code or default status_code
    //         message: translated_message,
    //         data: message.data || {} // Preserve data if available
    //     });
    // });
    // let encryptData = message;
    let encryptData = this.encrypt(message)
    res.status(status_code);
    // res.send(encryptData);
    res.send(message);
  }

  encrypt(data) {
    if (!constant.encryptionKey || !constant.encryptionIV) {
      throw new Error("Encryption key or IV is missing.");
    }

    const key = Buffer.from(constant.encryptionKey, "utf8");
    const iv = Buffer.from(constant.encryptionIV, "utf8");

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  }

  decryptPlain(data) {
    try {
      if (!data || typeof data !== 'string') {
        console.error('Invalid input: Data is empty or not a string');
        return JSON.stringify({});
      }

      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (!base64Regex.test(data)) {
        console.error('Invalid input: Data is not valid base64');
        return JSON.stringify({});
      }

      if (!constant.encryptionKey || !constant.encryptionIV) {
        throw new Error('Encryption key or IV is missing.');
      }

      const key = Buffer.from(constant.encryptionKey, 'utf8');
      const iv = Buffer.from(constant.encryptionIV, 'utf8');

      if (key.length !== 32) {
        throw new Error(`Invalid key length: ${key.length}, expected 32 bytes`);
      }
      if (iv.length !== 16) {
        throw new Error(`Invalid IV length: ${iv.length}, expected 16 bytes`);
      }

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption Error:', error.message);
      return JSON.stringify({});
    }
  }

  decodeBody = (req, res, next) => {
    try {
      console.log("Raw Request Headers:", req.headers); // Log all headers
      console.log("Raw req.body:", req.body); // Log raw body
      if (!lodash.isEmpty(req.body)) {
        if (typeof req.body === 'string') {
          try {
            req.body = JSON.parse(req.body);
          } catch (e) {
            req.body = JSON.parse(this.decryptPlain(req.body));
          }
        } else if (typeof req.body.data === 'string') {
          req.body.data = JSON.parse(this.decryptPlain(req.body.data));
        }
      } else {
        req.body = {};
      }
      console.log("Decoded req.body:", req.body); // Log decoded body
      next();
    } catch (error) {
      console.error('Body decoding error:', error.message);
      res.status(httpStatus.StatusCodes.BAD_REQUEST).send({
        code: httpStatus.StatusCodes.BAD_REQUEST,
        message: 'Invalid encrypted data',
        data: {}
      });
    }
  };

  generateToken(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  }

  generateRandomToken(length = 64) {
    return require('crypto').randomBytes(length / 2).toString('hex');
  }

  generateTrackingNumber() {
    return "TRK" + Math.floor(100000 + Math.random() * 900000);
  }

  generateOrderNumber() {
    return "ORD" + Math.floor(100000 + Math.random() * 900000);
  }

  haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degree) => (degree * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  sendEmailOTP(to_email, subject, otp_msg, callback, req) {
    // console.log(process.env.AUTH_MAIL,process.env.AUTH_PASS,to_email,subject,constant.from_email)
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.AUTH_MAIL, // generated ethereal user
        pass: process.env.AUTH_PASS, // generated ethereal password
      },
    }); // setup email data with unicode symbols
    let mailOptions = {
      from: constant.from_email, // sender address
      to: to_email, // list of receivers
      subject: subject, // Subject line
      html: "<h1>" + otp_msg + "</h1>",
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        // console.log("ERROR FOUND :::::::: ++++++++++++++ ")
        // console.log(error); //callback(true);
        return callback(error, null);
        //callback(error, []);
      } else {
        // callback(null, {code:code.SUCCESS, messages:req.language.success });
        return;
      }
    });
    //  callback(null, {code:code.SUCCESS, messages:req.language.success });
    return;
  }

  sendOtp() {
    console.log(process.env.TEST);
  }

  async sendLoginMail({ to_email, user_name, device_info }) {
    try {
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.AUTH_MAIL,
          pass: process.env.AUTH_PASS,
        },
        tls: {
          ciphers: "SSLv3",
        },
      });

      let deviceDetails = "";
      if (device_info && device_info.length) {
        deviceDetails = device_info.map(d =>
          `<li>Device Type: ${d.device_type || "Unknown"}<br>Token: ${d.token ? d.token.slice(0, 8) + "..." : "N/A"}</li>`
        ).join("");
      }

      let mailOptions = {
        from: process.env.AUTH_MAIL,
        to: to_email,
        subject: "Financyy - Login Notification",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
              .header { background: #2c3e50; color: #ffffff; padding: 15px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { padding: 20px; color: #333333; line-height: 1.6; }
              .footer { font-size: 12px; color: #777777; text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; }
              ul { padding-left: 20px; }
              li { margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Financyy</h1>
              </div>
              <div class="content">
                <h2>Hello ${user_name || "User"},</h2>
                <p>Your account was recently accessed. Here are the details:</p>
                <h3>Device Information</h3>
                <ul>${deviceDetails || "<li>No device info available.</li>"}</ul>
                <p>If this wasn't you, please secure your account immediately by changing your password or contacting support.</p>
              </div>
              <div class="footer">
                <p>This is an automated message from Financyy. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error("Login mail error:", error.message);
      return false;
    }
  }

  async sendWelcomeMail({ to_email, user_name }) {
    try {
      let transporter = require("nodemailer").createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.AUTH_MAIL,
          pass: process.env.AUTH_PASS,
        },
        tls: {
          ciphers: "SSLv3",
        },
      });

      let mailOptions = {
        from: process.env.AUTH_MAIL,
        to: to_email,
        subject: "Welcome to Financyy! 🎉",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
              .header { background: #2c3e50; color: #ffffff; padding: 15px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { padding: 20px; color: #333333; line-height: 1.6; }
              .button { display: inline-block; padding: 12px 24px; background: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .button:hover { background: #2980b9; }
              .footer { font-size: 12px; color: #777777; text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; }
              ul { padding-left: 20px; }
              li { margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Financyy</h1>
              </div>
              <div class="content">
                <h2>Welcome, ${user_name || "User"}!</h2>
                <p>Thank you for joining Financyy. We’re thrilled to help you manage your finances smarter and achieve your goals.</p>
                <h3>What You Can Do:</h3>
                <ul>
                  <li>Track your expenses and income</li>
                  <li>Set budgets and financial goals</li>
                  <li>Get insights and tips for better money management</li>
                </ul>
                <p>Get started by logging in and exploring your dashboard.</p>
                <a href="finacyy.netlify.app" class="button">Go to Dashboard</a>
                <p>We’re here to support you every step of the way!</p>
              </div>
              <div class="footer">
                <p>— The Financyy Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error("Welcome mail error:", error.message);
      return false;
    }
  }

  async sendResetPasswordMail({ to_email, user_name, reset_token }) {
    // const resetLink = `${process.env.APP_URL}/reset-password?token=${reset_token}`;
    const resetLink = `https://finacyy.netlify.app/reset-password?token=${reset_token}`;
    console.log("Reset Link:", resetLink);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.AUTH_MAIL,
        pass: process.env.AUTH_PASS,
      },
    }); // your smtp
    const mailOptions = {
      from: process.env.AUTH_MAIL,
      to: to_email,
      subject: "Financyy - Password Reset Request",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
            .header { background: #2c3e50; color: #ffffff; padding: 15px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 20px; color: #333333; line-height: 1.6; }
            .button { display: inline-block; padding: 12px 24px; background: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .button:hover { background: #2980b9; }
            .footer { font-size: 12px; color: #777777; text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Financyy</h1>
            </div>
            <div class="content">
              <h2>Hello ${user_name || "User"},</h2>
              <p>We received a request to reset your password. Click the button below to proceed:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <p>If the button doesn’t work, copy and paste this link into your browser:</p>
              <p><a href="${resetLink}">${resetLink}</a></p>
              <p>This link is valid for 1 hour. If you didn’t request this, please ignore this email or contact support.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Financyy. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    await transporter.sendMail(mailOptions);
  }


  async sendContactMail({ name, email, phone, message }) {
    try {
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.AUTH_MAIL,
          pass: process.env.AUTH_PASS,
        },
        tls: {
          ciphers: "SSLv3",
        },
      });

      const supportEmail = process.env.SUPPORT_EMAIL || process.env.AUTH_MAIL;

      // Admin notification email
      const adminMailOptions = {
        from: `"Financyy Support" <${process.env.AUTH_MAIL}>`,
        to: supportEmail,
        subject: "New Contact Us Message - Financyy",
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9fafb; padding: 24px;">
            <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 24px;">
              <h2 style="color: #2563EB;">New Contact Us Submission</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a></p>
              <p><strong>Phone:</strong> ${phone || "N/A"}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f3f4f6; border-radius: 4px; padding: 12px; margin-bottom: 16px;">${message}</div>
              <p style="font-size: 12px; color: #888;">Sent from Financyy Contact Us page on ${new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        })}</p>
            </div>
          </div>
        `,
      };

      // User confirmation email
      const userMailOptions = {
        from: `"Financyy Support" <${process.env.AUTH_MAIL}>`,
        to: email,
        replyTo: email, // Allows replying directly to the user's email
        subject: "Thank You for Contacting Financyy",
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9fafb; padding: 24px;">
            <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 24px;">
              <h2 style="color: #2563EB;">Thank You, ${name}!</h2>
              <p>We’ve received your message and will get back to you soon. Below are the details you submitted:</p>
              <div style="background: #f3f4f6; border-radius: 4px; padding: 12px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a></p>
                <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${phone || "Not provided"}</p>
                <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
                <div style="margin: 0;">${message}</div>
              </div>
              <p>For immediate assistance, visit our <a href="https://finacyy.netlify.app/support" style="color: #2563EB; text-decoration: none;">Support Center</a> or reply to this email.</p>
              <p style="font-size: 12px; color: #888; margin-bottom: 0;">Received on ${new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZoneName: 'short'
        })}</p>
              <p style="font-size: 12px; color: #888;">— The Financyy Team</p>
            </div>
          </div>
        `,
      };

      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(userMailOptions)
      ]);

      return { success: true, message: 'Contact form submitted successfully' };
    } catch (error) {
      console.error('Contact mail error:', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        message: 'Failed to send contact form. Please try again later.',
        error: error.message
      };
    }
  }

  async sendReportMail({ to_email, pdfBuffer, year, month }) {
    try {
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // TLS
        auth: {
          user: process.env.AUTH_MAIL,
          pass: process.env.AUTH_PASS,
        },
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
      });

      let mailOptions = {
        from: `"Financyy Reports" <${process.env.AUTH_MAIL}>`,
        to: to_email,
        subject: `📊 Your Financyy Report – ${month}/${year}`,
        text: `
  Hello,
  
  Attached is your finance report for ${month}/${year}, generated by Financyy.
  
  This report includes your income, expenses, savings, and top spending categories to help you stay financially informed.
  
  If you have any questions or feedback, feel free to reach out.
  
  Best regards,  
  Financyy Team
        `.trim(),
        html: `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #2E86DE; margin-bottom: 0;">📊 Financyy Monthly Report</h2>
    <p style="margin-top: 4px;"><strong>Month:</strong> ${month}/${year}</p>
  
    <p>Dear User,</p>
  
    <p>
      Please find your attached finance report for <strong>${month}/${year}</strong>. This PDF contains:
    </p>
    <ul>
      <li>💰 Total income and expenses</li>
      <li>📉 Net savings summary</li>
      <li>📂 Category-wise spending insights</li>
      <li>📈 Visual charts for your financial overview</li>
    </ul>
  
    <p>We hope this report helps you stay on top of your financial goals.</p>
  
    <p>
      For support or questions, feel free to contact us at 
      <a href="mailto:support@financyy.com">support@financyy.com</a>.
    </p>
  
    <p>Best regards,<br><strong>Financyy Team</strong></p>
  
    <hr style="border: none; border-top: 1px solid #ccc; margin-top: 20px;" />
    <p style="font-size: 12px; color: #888;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
        `,
        attachments: [
          {
            filename: `Finance_Report_${year}_${month}.pdf`,
            content: pdfBuffer,
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error("Report mail error:", error.message);
      return false;
    }
  }



  // ...inside Utility class...

  async sendReportMailWithPDF({ to_email, year, month, summary, categories, barChartImg, doughnutChartImg, user_name }) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", async () => {
          const pdfBuffer = Buffer.concat(buffers);

          // Dynamic values
          const totalIncome = summary?.data?.total_income ?? 0;
          const totalExpense = summary?.data?.total_expense ?? 0;
          const savings = summary?.data?.savings ?? 0;
          const displayName = user_name || "User";

          // Send professional HTML email if email provided
          if (to_email) {
            let transporter = require("nodemailer").createTransport({
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              auth: {
                user: process.env.AUTH_MAIL,
                pass: process.env.AUTH_PASS,
              },
            });

            const htmlBody = `
            <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:auto;">
              <h2 style="color:#2563eb;">Your Monthly Finance Report</h2>
              <p>Dear ${displayName},</p>
              <p>Please find attached your detailed finance report for <b>${month}/${year}</b>.</p>
              <ul>
                <li><b>Total Income:</b> ₹${totalIncome}</li>
                <li><b>Total Expenses:</b> ₹${totalExpense}</li>
                <li><b>Savings:</b> ₹${savings}</li>
              </ul>
              <p>For a full breakdown, see the attached PDF.</p>
              <hr/>
              <p style="font-size:12px;color:#888;">This is an automated email from Financyy. Please do not reply.</p>
            </div>
          `;

            await transporter.sendMail({
              from: `"Financyy Reports" <${process.env.AUTH_MAIL}>`,
              to: to_email,
              subject: `📊 Financyy Monthly Report – ${month}/${year}`,
              html: htmlBody,
              attachments: [
                {
                  filename: `Finance_Report_${year}_${month}.pdf`,
                  content: pdfBuffer,
                },
              ],
            });
          }

          resolve(pdfBuffer);
        });

        // --- PDF Content ---
        doc.fontSize(22).fillColor('#2563eb').text("Financyy Monthly Report", { align: "left" });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#444').text(`Month: ${month}/${year}`, { align: "left" });
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
        doc.moveDown();

        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#2563eb');
        doc.moveDown();

        doc.fontSize(16).fillColor('#222').text("Summary", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#111').list([
          `Total Income: ₹${summary?.data?.total_income || 0}`,
          `Total Expenses: ₹${summary?.data?.total_expense || 0}`,
          `Savings: ₹${summary?.data?.savings || 0}`
        ]);
        doc.moveDown();

        if (barChartImg) {
          const barImg = barChartImg.replace(/^data:image\/\w+;base64,/, "");
          doc.fontSize(14).fillColor('#2563eb').text("Monthly Summary Chart:", { align: "left" });
          doc.image(Buffer.from(barImg, "base64"), { fit: [420, 180], align: "center" });
          doc.moveDown();
        }

        doc.fontSize(16).fillColor('#222').text("Top Spending Categories", { underline: true });
        doc.moveDown(0.5);
        if (categories?.data?.length) {
          categories.data.forEach((c, idx) => {
            doc.fontSize(12).fillColor('#444').text(`${idx + 1}. ${c.category}: ₹${c.total_spent}`);
          });
        } else {
          doc.fontSize(12).fillColor('#888').text("No category data available.");
        }
        doc.moveDown();

        if (doughnutChartImg) {
          const doughnutImg = doughnutChartImg.replace(/^data:image\/\w+;base64,/, "");
          doc.fontSize(14).fillColor('#2563eb').text("Spending Categories Chart:", { align: "left" });
          doc.image(Buffer.from(doughnutImg, "base64"), { fit: [320, 160], align: "center" });
          doc.moveDown();
        }

        doc.moveDown();
        doc.fontSize(10).fillColor('#888').text("Report generated by Financyy | https://financyy.com", { align: "center" });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  








}

module.exports = new Utility();

let u = new Utility();
