const nodemailer = require('nodemailer');

mailer = async(usermail,asunto,contenido) => {
    var transporter = await nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: false,
        auth: {
            user: process.env.MAIL_BACKEND,
            pass: process.env.MAIL_PASS
        }
    });
    var mailOptions = {
        from: process.env.MAIL_BACKEND,
        to: usermail,
        subject: asunto,
        text: contenido,
    }
    transporter.sendMail(mailOptions);
}

module.exports = mailer;