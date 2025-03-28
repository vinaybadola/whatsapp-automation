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

const determinePunchType = async (LocalPunchTime,userDateTime, shiftStart, shiftEnd, employeeCode, isNightShift) => {
  // Before checking punch-in or punch-out check from user-attendance-model if user has already punched in
  // If user has already punched in, then it's a punch-out for today 
  if(!isNightShift){
    const shiftDateStr = new Date(userDateTime).toISOString().split('T')[0];
    const shiftDateStart = new Date(shiftDateStr);
    const shiftDateEnd = new Date(shiftDateStr);
    shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

    const latestAttendance = await checkExistingPunchForDayShift(employeeCode, shiftDateStart, shiftDateEnd);

    if (latestAttendance) {
      return 'punch-out';
    }
  }

  if(isNightShift){
    // If current time is less than 1 hour from shift start time and more than 4 hour from shift start time, then it's a punch-in
    // If current time is more than 4 hour from the shift start time 
    const shiftStarted = new Date(shiftStart); 
    const punch = new Date(LocalPunchTime); 

    const diffInHours = (punch - shiftStarted) / (1000 * 60 * 60); // Difference in hours

    if (diffInHours >= -1 && diffInHours < 0) {
        return "punch-in";
    } else if (diffInHours >= 0 && diffInHours <= 4) {
        return "punch-in";
    } else if (diffInHours > 4) {
        return "punch-out";
    }
  }

  // if user punched in after shiftEnd, it's a punch-out
  if (userDateTime > shiftEnd) {
    return 'punch-out';
  }
  // if user punched in before shiftStart, it's a punch-in
  if (userDateTime < shiftStart) {
    return 'punch-in';
  }

  // if user punched in after 6 hours of shiftStart, it's a punch-out
  console.log('shiftStart', shiftStart);
  console.log('userDateTime', userDateTime);

  if (LocalPunchTime > new Date(shiftStart.getTime() + 6 * 60 * 60 * 1000)) {
    return 'punch-out';
  }

  const timeToStart = Math.abs(userDateTime - shiftStart);
  const timeToEnd = Math.abs(userDateTime - shiftEnd);

  return timeToStart <= timeToEnd ? "punch-in" : "punch-out";
};

const checkPunchOutValidity = (userPunchOut, shiftEnd) => {
  const isLeavingEarly = userPunchOut < shiftEnd;
  let earlyBy = isLeavingEarly ? Math.abs(shiftEnd - userPunchOut) / (60 * 1000) : 0;

  const hours = Math.floor(earlyBy / 60);
  const minutes = (earlyBy % 60).toFixed(0);
  earlyBy = `${hours} hours ${minutes} minutes`;

  return { isLeavingEarly,earlyBy };
};

const calculateAllowedWindow = (shiftStart) => ({
  allowedPunchInStart: new Date(shiftStart.getTime() + 30 * 60 * 1000),
});

const checkPunchInValidity = (userPunchIn, shiftStart, gracePeriod) => {

  const maxAllowedPunchIn = new Date(shiftStart.getTime() + gracePeriod);  
  const isWithinWindow = new Date(userPunchIn) <= maxAllowedPunchIn ? true : false;

  if (userPunchIn < shiftStart) {
    return { isWithinWindow: true, lateBy: "0 hours 0 minutes" };
  }

  let lateBy = !isWithinWindow ? Math.abs(userPunchIn - shiftStart) / (60 * 1000) : 0;
  
  const hours = Math.floor(lateBy / 60);
  const minutes = (lateBy % 60).toFixed(0);
  lateBy = `${hours} hours ${minutes} minutes`;

  return { isWithinWindow, lateBy };
};

const checkExistingPunchForDayShift = async (employeeCode, shiftDateStart, shiftDateEnd) => {
  return await UserAttendance.findOne({
    employeeCode,
    userpunchInTime: { $gte: shiftDateStart, $lt: shiftDateEnd }
  });

}

export {
  parseShiftTime,
  determinePunchType,
  checkPunchOutValidity,
  calculateAllowedWindow,
  checkPunchInValidity,
  checkExistingPunchForDayShift
};
