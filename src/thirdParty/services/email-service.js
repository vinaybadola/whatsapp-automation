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
        const { name, number, templateType } = data;
        const fetchTemplate = await Template.findOne({ templateType: templateType, isActive: true });

        if (!fetchTemplate) {
            console.log(`No active Template found for sending mail to user of type :  ${templateType}`);
            throw new Error('Template not found');
        }
        const template = fetchTemplate.template.replace(/{{name}}/g, name).replace(/{{number}}/g, number);
        const subject = fetchTemplate.subject;
        return {template, subject};
    }

    /**
     * Sends a notification email using Nodemailer.
     *
     * @param {Object} detailsData - The details of the email to be sent.
     * @param {string} detailsData.to - The recipient's email address.
     * @param {string} [detailsData.subject] - The subject of the email. Defaults to 'Notification' if not provided.
     * @param {string} template - The content of the email. Can be plain text or HTML.
     *
     * @returns {Promise<void>} - A promise that resolves when the email is sent successfully.
     *
     * @throws {Error} - Throws an error if there is an issue sending the email.
     */
    async sendNotificationMail(data) {
        try {
            // Determine if the connection should be secure based on the port
            const isSecure = this.config.smtpPort === 465;

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
                from: `"${smptFrom}" <${adminMail}>`,
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
