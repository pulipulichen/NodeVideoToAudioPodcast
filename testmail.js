var nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
      user: 'swdbrldojicgdmuu@ethereal.email',
      pass: 'Mk2BkERFAZyAYcDmEE'
  }
});

transporter.sendMail({
  from: 'node-video-to-audio@ethereal.email',
  to: 'pudding@nccu.edu.tw',
  subject: 'Test Email Subject',
  html: '<h1>Example HTML Message Body</h1>'
});