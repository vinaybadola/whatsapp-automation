import UserAttendance from "../../src/attendance/models/user-attendance-model.js";
import Defaulters from "../../src/attendance/models/user-defaulters-model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import connectDB from "../../config/database.js";

dotenv.config();

await connectDB();

const fetchLateEmployees = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const lateEmployees = await Defaulters.find({
        isLate: true, 
        date: { $gte: today, $lt: endOfDay } 
    }).populate({
        path: 'userAttendanceId',
        select: 'employeeName'
    });

    processData(lateEmployees);
};

const processData = async (data) => {
    if (!data.length) {
        console.log("No late employees today.");
        return;
    }

    const lateEmployees = data.map((employee) => ({
        name: employee.userAttendanceId?.employeeName || "Unknown",
        lateBy: employee.lateByTime,
        employeeCode: employee.employeeCode,
        date: employee.date.toISOString().split("T")[0] // Get date part only
    }));

    const totalLateEmployees = lateEmployees.length;

    // Generate Graph
    const chartUrl = generateGraph(lateEmployees);

    // Send Email Report
    sendLateReportEmail(lateEmployees, totalLateEmployees, chartUrl);
};

const generateGraph = (lateEmployees) => {
    const labels = lateEmployees.map(emp => emp.name);
    const lateTimes = lateEmployees.map(emp => parseInt(emp.lateBy)); // Convert to integer minutes

    const chartConfig = {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Late by (minutes)",
                data: lateTimes,
                backgroundColor: "rgba(255, 99, 132, 0.5)"
            }]
        }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

const sendLateReportEmail = async (lateEmployees, totalLateEmployees, chartUrl) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_EMAIL_PASSWORD,
        }
    });

    const emailHtml = `
        <h2>Daily Late Attendance Report</h2>
        <p>Total Late Employees: <b>${totalLateEmployees}</b></p>
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

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: "vinaybadola46@gmail.com",
            subject: "Daily Late Attendance Report",
            html: emailHtml,
        });

        console.log("Late attendance report sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

fetchLateEmployees();