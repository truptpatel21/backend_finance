const globals = require('../config/constant')

var  Message = {
    welcome : `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to test Ride</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f8fafd;
                        color: #1a1a1a;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        padding: 20px;
                        background: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        padding: 20px;
                        background-color: #1075E8;
                        color: white;
                        font-size: 24px;
                        font-weight: bold;
                        border-top-left-radius: 8px;
                        border-top-right-radius: 8px;
                    }
                    .content {
                        padding: 20px;
                        text-align: center;
                        font-size: 18px;
                    }
                    .button {
                        display: inline-block;
                        background-color: #1075E8;
                        color: white;
                        padding: 12px 20px;
                        text-decoration: none;
                        font-size: 16px;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .button:hover {
                        background-color: #0A5EBF;
                    }
                    .footer {
                        text-align: center;
                        font-size: 14px;
                        color: #555;
                        padding: 15px;
                        border-top: 1px solid #ddd;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">Welcome to Cargo Ride</div>
                    <div class="content">
                        <p>Thank you for signing up with Cargo Ride!</p>
                        <p>We are excited to have you onboard. Get ready for a seamless logistics experience.</p>
                        <a href="https://google.com" class="button">Get Started</a>
                    </div>
                    <div class="footer">
                        &copy; 2025 Cargo Ride. All rights reserved.
                    </div>
                </div>
            </body>
            </html>`,

            generateOrderContent(order) {
                return `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .container { background: #fff; padding: 20px; border-radius: 8px; width: 600px; margin: auto; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
                        .header { background: ${order.order.order_status === 'cancelled' ? '#dc3545' : '#007bff'}; color: #fff; padding: 15px; text-align: center; font-size: 20px; font-weight: bold; border-radius: 8px 8px 0 0; }
                        .section { margin: 15px 0; padding: 10px; border-bottom: 1px solid #ddd; }
                        .title { font-size: 16px; font-weight: bold; color: #333; }
                        .info { font-size: 14px; color: #555; margin-top: 5px; }
                        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
                        .cancel-reason { color: #dc3545; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">${'Order Delivered Successfully'}</div>
                        <div class="section">
                            <div class="title">Order ID:</div>
                            <div class="info">${order.order.o_no}</div>
                        </div>
                        <div class="section">
                            <div class="title">Order Date:</div>
                            <div class="info">${new Date(order.order.o_date).toLocaleString()}</div>
                        </div>
                        <div class="section">
                            <div class="title">Scheduled Delivery Date:</div>
                            <div class="info">${new Date(order.order.schedule_date).toLocaleString()}</div>
                        </div>
                        ${order.order.order_status === 'cancelled' ? `
                        <div class="section">
                            <div class="title">Cancellation Reason:</div>
                            <div class="info cancel-reason">${order.order.order_cancel_reason.replace(/_/g, ' ')}</div>
                        </div>
                        ` : ''}
                        <div class="section">
                            <div class="title">Delivery Address:</div>
                            <div class="info">${order.address.receiver_name}, ${order.address.receiver_address}</div>
                        </div>
                        <div class="section">
                            <div class="title">Sender Information:</div>
                            <div class="info">${order.address.sender_name}, ${order.address.sender_address} (Email: ${order.address.sender_email}, Phone: ${order.address.sender_phone})</div>
                        </div>
                        <div class="section">
                            <div class="title">Items:</div>
                            <div class="info">
                                ${order.packages.map(pkg => `
                                    <div>- ${pkg.type} (${pkg.weight} ${pkg.weight_type}) - ${pkg.notes}</div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="section">
                            <div class="title">Total Price:</div>
                            <div class="info">$${order.order.total_price}</div>
                        </div>
                        <div class="section">
                            <div class="title">Driver Information:</div>
                            <div class="info">${order.driver.name} (Phone: ${order.driver.mobile}, Vehicle: ${order.order.vehicle_details})</div>
                        </div>
                        ${order.pod ? `
                        <div class="section">
                            <div class="title">Proof of Delivery (POD):</div>
                            <div class="info">${order.pod.name} (Company: ${order.pod.company_name}, Email: ${order.pod.email}, Phone: ${order.pod.phone}, Address: ${order.pod.address})</div>
                        </div>
                        ` : ''}
                        <div class="footer">Thank you for choosing our service!</div>
                    </div>
                </body>
                </html>
                `;
            },
            
            

            generateOtpEmail(otp) {
                return `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .container { background: #fff; padding: 20px; border-radius: 8px; width: 400px; margin: auto; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1); text-align: center; }
                        .header { background: #007bff; color: #fff; padding: 15px; font-size: 22px; font-weight: bold; border-radius: 8px 8px 0 0; }
                        .otp { font-size: 28px; font-weight: bold; color: #007bff; padding: 15px; border: 2px dashed #007bff; display: inline-block; margin: 20px 0; letter-spacing: 4px; }
                        .footer { font-size: 12px; color: #777; margin-top: 20px; padding: 10px; border-top: 1px solid #ddd; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">Your OTP Code</div>
                        <div class="otp">${otp}</div>
                        <div class="footer">This OTP is valid for a limited time. Do not share it with anyone.</div>
                    </div>
                </body>
                </html>
                `;
            },
            
            generateContactEmailContent (user, title, subject, description){
                return `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .container { background: #fff; padding: 20px; border-radius: 8px; width: 600px; margin: auto; }
                        .header { background: #007bff; color: #fff; padding: 10px; text-align: center; font-size: 20px; }
                        .section { margin: 15px 0; }
                        .title { font-size: 16px; font-weight: bold; }
                        .info { font-size: 14px; color: #555; }
                        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">New Contact Inquiry</div>
                        <div class="section">
                            <div class="title">User:</div>
                            <div class="info">${user.name} (${user.email})</div>
                        </div>
                        <div class="section">
                            <div class="title">Title:</div>
                            <div class="info">${title}</div>
                        </div>
                        <div class="section">
                            <div class="title">Subject:</div>
                            <div class="info">${subject}</div>
                        </div>
                        <div class="section">
                            <div class="title">Description:</div>
                            <div class="info">${description}</div>
                        </div>
                        <div class="footer">Cargo App Support</div>
                    </div>
                </body>
                </html>`;
            },
            

             generatePasswordResetEmail  (firstName,token) {
                return `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .container { background: #fff; padding: 20px; border-radius: 8px; width: 600px; margin: auto; }
                        .header { background: #007bff; color: #fff; padding: 10px; text-align: center; font-size: 20px; }
                        .content { font-size: 16px; color: #333; margin-top: 20px; }
                        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">Password Reset Request</div>
                        <div class="content">
                            Dear ${firstName},<br><br>
                            Please use the link below to change your password!<br><br>
                            <a href="http://localhost/resetemailpassword.php?token=${token}" class="button">Change Password</a><br><br>
                            Do not share your password with anyone.
                        </div>
                        <div class="footer">Thank you,<br>${globals.app_name} Team</div>
                    </div>
                </body>
                </html>`
        }
}

module.exports = Message