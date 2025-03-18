import fs from "fs";
import path from "path";
import cron from "node-cron";
import { fileURLToPath } from 'url';
import puppeteer from "puppeteer";
import UserAttendance from "../../src/attendance/models/user-attendance-model.js";
import Defaulters from "../../src/attendance/models/user-defaulters-model.js";
import LateAttendanceReport from "../../src/attendance/models/late-attendance-report-model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import connectDB from "../../config/database.js";
import {puppeterBrowserPath} from "../../config/envConfig.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
await connectDB();

const fetchLateEmployees = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return await Defaulters.find({
        isLate: true,
        date: { $gte: today, $lt: endOfDay }
    }).populate({ path: "userAttendanceId", select: "employeeName" })
    .then((data) => data.map((employee) => ({
        name: employee.userAttendanceId?.employeeName || "Unknown",
        lateByForHtml: employee.lateByTime,
        employeeCode: employee.employeeCode,
        lateBy: extractMinutes(employee.lateByTime),
        date: new Date(employee.date).toISOString().split("T")[0],
        formattedLateBy: formatTime(extractMinutes(employee.lateByTime))
    })));
};

const extractMinutes = (timeString) => {
    const match = timeString.match(/(\d+)\s*hours?\s*(\d*)\s*minutes?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    return (hours * 60) + minutes;
};

const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
};

const generateChartImage = async (lateEmployees) => {
    const templatePath = path.join(__dirname, "../../public/attendance-report.html");
    let templateHtml = fs.readFileSync(templatePath, "utf8");

    templateHtml = templateHtml.replace("__DATA__", JSON.stringify(lateEmployees));

    const timestamp = Date.now();
    const outputPath = path.join(__dirname, "../../uploads/reports", `attendance_${timestamp}.png`);
    const dbPath = path.join("uploads/reports", `attendance_${timestamp}.png`);

    const browser = await puppeteer.launch( {executablePath: puppeterBrowserPath,  headless: true,  args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox", 
        "--disable-gpu", 
        "--single-process", 
        "--no-zygote"
    ] });
    const page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: "networkidle2" });
    await page.screenshot({ path: outputPath });

    await browser.close();
    console.log("✅ Chart image saved:", outputPath);

    return outputPath;
};

const sendLateReportEmail = async (imagePath, lateEmployees) => {
    const transporter = nodemailer.createTransport({
        host:process.env.SMTP_HOST,
        auth: { user: process.env.ADMIN_EMAIL, pass: process.env.ADMIN_EMAIL_PASSWORD }
    });

    try{
        await LateAttendanceReport.create({
            chartUrl: imagePath,
            lateEmployeesCount: lateEmployees.length,
            lateEmployees: lateEmployees,
            date: new Date().toISOString().split("T")[0]
        });
    }
    catch(error){
        console.log("Error in updating late report collection ", error);
    }

    const emailHtml = `
        <h2>Daily Late Attendance Report</h2>
        <p>See the latest attendance report below:</p>
        <br>
        <img src="cid:chartImage" alt="Late Employees Graph" width="600"/>
        <h1>Total Late Employees: <b>${lateEmployees.length}</b></h1>
            <table border="1" cellspacing="0" cellpadding="5" width="100%">
                <tr>
                    <th>Name</th>
                    <th>Employee Code</th>
                    <th>Late By (Minutes)</th>
                    <th>Date</th>
                </tr>
                ${lateEmployees.map(emp => `
                    <tr>
                        <td>${emp.name}</td>
                        <td>${emp.employeeCode}</td>
                        <td>${emp.lateByForHtml}</td>
                        <td>${emp.date}</td>
                    </tr>
                `).join("")}
            </table>
        <br>
    `;

    try {
        await transporter.sendMail({
            from: process.env.ADMIN_EMAIL,
            to: process.env.MANAGEMENT_EMAIL,
            subject: "Late Attendance Report for Today 🕒",
            html: emailHtml,
            attachments: [{
                filename: "attendance-report.png",
                path: imagePath,
                cid: "chartImage" 
            }]
        });

        console.log("📩 Late attendance report email sent!");
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

const runFetchLateAttendanceReportJob = async () => {
    console.log("🚀 Running late attendance report job...");
    cron.schedule("00 20 * * *", async () => {
    try {
        const lateEmployees = await fetchLateEmployees();
        if (!lateEmployees.length) {
            console.log(" No late employees today!");
            return;
        }
        const imagePath = await generateChartImage(lateEmployees);
        await sendLateReportEmail(imagePath, lateEmployees);

        console.log("Late attendance report job completed.");
    } catch (error) {
        console.error("Error running job:", error);
    }
    });
    
};

runFetchLateAttendanceReportJob();

export { runFetchLateAttendanceReportJob };