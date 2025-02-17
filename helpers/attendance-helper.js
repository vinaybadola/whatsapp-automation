import UserAttendance from "../src/attendance/models/user-attendance-model.js";

const parseShiftTime = (shiftTimeStr, baseDate) => {
  const [startTimeStr, endTimeStr] = shiftTimeStr.split(" - ");

  const parseTime = (timeStr, date) => {
    const [hours, minutes] = timeStr.split(":").map((s) => parseInt(s.trim()));
    const parsedDate = new Date(date);
    parsedDate.setHours(hours, minutes, 0, 0);
    return parsedDate;
  };

  return {
    shiftStart: parseTime(startTimeStr, baseDate),
    shiftEnd: parseTime(endTimeStr, baseDate),
  };
};

const determinePunchType = async (userDateTime, shiftStart, shiftEnd, employeeCode) => {
  // Before checking punch-in or punch-out check from user-attendance-model if user has already punched in
  // If user has already punched in, then it's a punch-out for today 
  const latestAttendance = await UserAttendance.findOne({
    employeeCode
  }).sort({ actualPunchInTime: -1 });

  if (latestAttendance) {
    if (latestAttendance.hasPunchedIn === true ) {
      return 'punch-out';
    }
  }

  const shiftStartPlus5Hours = new Date(shiftStart);
  shiftStartPlus5Hours.setHours(shiftStart.getHours() + 5);

  // If user punched in within 4-6 hours from shiftStart, it's a punch-in
  // if (userDateTime > shiftStart && userDateTime < shiftStartPlus5Hours) {
  //   return 'punch-in';
  // }

  // if user punched in after shiftEnd, it's a punch-out
  if (userDateTime > shiftEnd) {
    return 'punch-out';
  }

  const timeToStart = Math.abs(userDateTime - shiftStart);
  const timeToEnd = Math.abs(userDateTime - shiftEnd);

  return timeToStart <= timeToEnd ? "punch-in" : "punch-out";
};

const checkPunchOutValidity = (userPunchOut, shiftEnd) => {
  const isLeavingEarly = userPunchOut < shiftEnd;
  const isLate = userPunchOut > shiftEnd;
  let earlyBy = isLeavingEarly ? Math.abs(shiftEnd - userPunchOut) / (60 * 1000) : 0;

  const hours = Math.floor(earlyBy / 60);
  const minutes = (earlyBy % 60).toFixed(0);
  earlyBy = `${hours} hours ${minutes} minutes`;

  return { isLeavingEarly, isLate, earlyBy };
};

const calculateAllowedWindow = (shiftStart) => ({
  allowedPunchInStart: new Date(shiftStart.getTime() + 30 * 60 * 1000),
});

const checkPunchInValidity = (userPunchIn, shiftStart, gracePeriod, allowedPunchInEnd) => {

  const isWithinWindow = userPunchIn >= shiftStart && userPunchIn <= allowedPunchInEnd;

  const isLate = userPunchIn > allowedPunchInEnd;

  let lateBy = isLate ? Math.abs(userPunchIn - shiftStart) / (60 * 1000) : 0;

  const hours = Math.floor(lateBy / 60);
  const minutes = (lateBy % 60).toFixed(0);
  lateBy = `${hours} hours ${minutes} minutes`;

  return { isWithinWindow, isLate, lateBy };
};
export {
  parseShiftTime,
  determinePunchType,
  checkPunchOutValidity,
  calculateAllowedWindow,
  checkPunchInValidity,
};
