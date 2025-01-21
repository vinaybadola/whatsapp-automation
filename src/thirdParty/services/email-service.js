import { createTransport } from 'nodemailer';
import { adminMail, adminPassword, smtpHost, smtpPort, smptFrom } from "../../../config/envConfig.js";
import Template from '../../templates/models/template-model.js';

export default class Email {

    /**
     * The function PrepareMailTemplate retrieves an active email template based on the template type
     * and replaces placeholders with provided data.
     * @param data - {
     * @returns The function `PrepareMailTemplate` is returning a mail template with placeholders for
     * name and number replaced with actual values from the provided data.
     */
    async PrepareMailTemplate(data) {
        const { name, phoneNumber, templateType } = data;
        const fetchTemplate = await Template.findOne({ templateType: templateType, isActive: true });

        if (!fetchTemplate) {
            console.log(`No active Template found for sending mail to user of type :  ${templateType}`);
            throw new Error('Template not found');
        }
        const template = fetchTemplate.template.replace(/{{name}}/g, name).replace(/{{number}}/g, phoneNumber);
        const subject = fetchTemplate.subject;
        return {template, subject};
    }

   /**
    * The function `sendNotificationMail` sends an email notification using SMTP with provided data and
    * template.
    * @param data - The `data` parameter in the `sendNotificationMail` function likely contains
    * information needed to send the notification email. This could include details such as the
    * recipient's email address (`data.mail`), and any other relevant data required to populate the
    * email template and subject.
    */
    async sendNotificationMail(data) {
        try {
            // Determine if the connection should be secure based on the port
            const isSecure = smtpPort === 465 || smtpPort === 587;

            const transporter = createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: isSecure,  // true for 465, false for other ports
                auth: {
                    user: adminMail,
                    pass: adminPassword,
                },
            });

            const {template, subject} = await this.PrepareMailTemplate(data);

            const mailOptions = {
                from: `"${smptFrom }" <${adminMail}>`,
                to: data.mail,
                subject: subject || 'Alert Notification',
                text: template, // 'text' for plain text emails or 'html' for HTML emails
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent successfully : ${info.response}`);
        } catch (error) {
            console.error(`Error sending mail: ${error.message}`);
            // throw new Error(`Error sending mail: ${error.message}`);  keep this in comment to avoid breaking the code
        }
    }
}