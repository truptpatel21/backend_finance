const httpStatus = require("http-status-codes");
const connection = require("../config/database");
const code = require("./request-error-code");
const message = require("../languages/en");
const constant = require("../config/constant");
const cryptLib = require("cryptlib");
const lodash = require("lodash");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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
                <a href="https://financyy.netlify.app" class="button">Go to Dashboard</a>
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






}

module.exports = new Utility();

let u = new Utility();
