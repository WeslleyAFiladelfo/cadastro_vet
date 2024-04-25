const nodemailer = require('nodemailer');

function sendNotificationEmail(produtoData, userEmail, token, continuationLink) {
    // Configuração do transporte de e-mail
    const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'cadastro_pet@outlook.com', // Seu e-mail do Outlook
            pass: 'Gic@29098' // Sua senha do e-mail do Outlook
        }
    });

    // Construção do texto do e-mail com base nos dados do produto
    let mailText = 'Há um novo cadastro de produto pendente.\n';

    // Iteração sobre as propriedades do produtoData para incluir no texto do e-mail
    for (const key in produtoData) {
        if (produtoData[key]) {
            mailText += `${key}: ${produtoData[key]}\n`;
        }
    }

    // Configuração das opções do e-mail
    const mailOptions = {
        from: 'cadastro_pet@outlook.com',
        to: 'cadastro_pet@outlook.com',
        subject: 'Novo Cadastro de Produto Pendente',
        text: mailText + `\nLink para continuar o cadastro: ${continuationLink}`
    };

    // Envio do e-mail utilizando o transporte configurado
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Erro ao enviar e-mail:', error);
        } else {
            console.log('E-mail de notificação enviado com sucesso:', info.response);
        }
    });
}

module.exports = { sendNotificationEmail };
