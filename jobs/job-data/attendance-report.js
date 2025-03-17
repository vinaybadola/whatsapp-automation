import cron from "node-cron";
import UserAttendance from "../../src/attendance/models/user-attendance-model.js";
import Defaulters from "../../src/attendance/models/user-defaulters-model.js";
import LateAttendanceReport from "../../src/attendance/models/late-attendance-report-model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import connectDB from "../../config/database.js";

dotenv.config();

await connectDB();


const runFetchLateAttendanceReportJob = async () => {
    cron.schedule("26 13 * * *", async () => {
        console.log("Running late attendance report job...");
        try {
            const lateEmployees = await fetchLateEmployees();

            const chartUrl = lateEmployees.length ? generateGraph(lateEmployees) : null;

            await saveReport(lateEmployees, chartUrl);
            await sendLateReportEmail(lateEmployees, chartUrl);

            console.log("Late attendance report job completed.");
        } catch (error) {
            console.error("Error running late attendance report job:", error);
        }
    });
};

const fetchLateEmployees = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return await Defaulters.find({
        isLate: true,
        date: { $gte: today, $lt: endOfDay }
    }).populate({
        path: 'userAttendanceId',
        select: 'employeeName'
    }).then((data) => data.map((employee) => ({
        name: employee.userAttendanceId?.employeeName || "Unknown",
        lateBy: employee.lateByTime,
        employeeCode: employee.employeeCode,
        date: employee.date.toISOString().split("T")[0]
    })));
};

const saveReport = async (lateEmployees, chartUrl) => {
    await LateAttendanceReport.create({
        chartUrl,
        lateEmployeesCount: lateEmployees.length,
        lateEmployees,
        date: new Date()
    });
};

const generateGraph = (lateEmployees) => {
    const labels = lateEmployees.map(emp => emp.name);
    const lateTimes = lateEmployees.map(emp => extractMinutes(emp.lateBy));

    const chartConfig = {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Late by (minutes)",
                data: lateTimes,
                backgroundColor: "rgba(99, 102, 255, 0.7)"
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: "Employee Names", font: { size: 14 } }, ticks: { font: { size: 12 } } },
                y: { title: { display: true, text: "Late Time (Minutes)", font: { size: 14 } }, ticks: { stepSize: 5, font: { size: 12 } } }
            },
            plugins: { legend: { display: true, position: "top" } }
        }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

const sendLateReportEmail = async (lateEmployees, chartUrl) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_EMAIL_PASSWORD,
        }
    });

    let emailHtml;
    let subject;

    if (lateEmployees.length) {
        subject = "Daily Late Attendance Report";
        emailHtml = `
            <h2>Daily Late Attendance Report</h2>
            <p>Total Late Employees: <b>${lateEmployees.length}</b></p>
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
                        <td>${emp.lateBy}</td>
                        <td>${emp.date}</td>
                    </tr>
                `).join("")}
            </table>
            <br>
            <img src="${chartUrl}" alt="Late Employees Graph" width="600"/>
        `;
    } else {
        subject = "No Late Employees Today 🎉";
        emailHtml = `
            <h2>No Late Attendance Today</h2>
            <p>Great news! No employees were late today.</p>
            <p>Thank you for your attention.</p>
        `;
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.MANAGEMENT_EMAIL,
            subject: subject,
            html: emailHtml,
        });

        console.log(`📩 Email sent: ${subject}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

const extractMinutes = (timeString) => {
    const match = timeString.match(/(\d+)\s*hours?\s*(\d*)\s*minutes?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;

    return (hours * 60) + minutes;
};

export {runFetchLateAttendanceReportJob};