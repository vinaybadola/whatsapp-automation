import Defaulters from "../src/attendance/models/user-defaulters-model.js";

export const ISODateChanger = (date) => {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${date}`);
    }
    return parsedDate.toISOString().split("Z")[0] + "+00:00";
};

export const validateDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) {
        throw new Error("Invalid date format");
    }
    return new Date(date);
};

export const calculateTotalHours = (userPunchInTime, userPunchOutTime) => {
    const diffMs = new Date(userPunchOutTime) - new Date(userPunchInTime);
    const totalHours = Math.floor(diffMs / 3600000);
    const totalMinutes = Math.floor((diffMs % 3600000) / 60000);
    return { 
        totalHours, 
        totalHoursString: `${totalHours} hours ${totalMinutes} minutes` 
    };
};

export const calculateIsLateOrEarly = (actualPunchInTime, userPunchInTime, actualPunchOutTime, userPunchOutTime, gracePeriod = 30) => {
    const punchInDiff = new Date(userPunchInTime) - new Date(actualPunchInTime);
    const punchOutDiff = new Date(userPunchOutTime) - new Date(actualPunchOutTime);

    const totalLateMinutes = Math.floor(punchInDiff / 60000);
    const totalEarlyMinutes = Math.abs(Math.floor(punchOutDiff / 60000));

    const isLate = totalLateMinutes > gracePeriod;
    const isOnTime = totalLateMinutes <= gracePeriod;
    const isLeavingEarly = totalEarlyMinutes > gracePeriod;

    return { 
        isLate, 
        isLateTime: isLate ? `${Math.floor(totalLateMinutes / 60)} hours ${totalLateMinutes % 60} minutes` : "", 
        isOnTime, 
        isLeavingEarly, 
        earlyBy: isLeavingEarly ? `${Math.floor(totalEarlyMinutes / 60)} hours ${totalEarlyMinutes % 60} minutes` : "" 
    };
};

export const updateDefaulters = async (employeeCode, date, isLate, isLeavingEarly, userpunchInTime, userPunchOutTime, isLateTime, earlyBy, userAttendanceId) => {
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);

    if (isLate) {
        await Defaulters.updateOne(
            { employeeCode, date: todayStart },
            { $set: { isLate: true, punchInTime: userpunchInTime, lateByTime: isLateTime, userAttendanceId } },
            { upsert: true }
        );
    } else {
        await Defaulters.updateOne(
            { employeeCode, date: todayStart },
            { $unset: { isLate: "", punchInTime: "", lateByTime: "" } }
        );
    }

    if (isLeavingEarly) {
        await Defaulters.updateOne(
            { employeeCode, date: todayStart },
            { $set: { isLeavingEarly: true, punchOutTime: userPunchOutTime, earlyBy, userAttendanceId } },
            { upsert: true }
        );
    } else {
        await Defaulters.updateOne(
            { employeeCode, date: todayStart },
            { $unset: { isLeavingEarly: "", punchOutTime: "", earlyBy: "" } }
        );
    }
};
