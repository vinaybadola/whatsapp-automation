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

    const latestAttendance = await checkExistingPunch(employeeCode, shiftDateStart, shiftDateEnd);

    if (latestAttendance) {
      return 'punch-out';
    }
  }

  if(isNightShift){
    // check for latest attendance with or condition of if punch is after shift start time or before 2 hours

    // calculate two hours prior from the shift start time 
    const twoHoursPrior = new Date(shiftStart.getTime() - 2 * 60 * 60 * 1000);
    console.log('twoHoursPrior', twoHoursPrior);
    
    const latestAttendance = await UserAttendance.findOne({
      employeeCode : employeeCode
    }).or([
      {
        userpunchInTime: { $gte: twoHoursPrior}
      },
      {
        userpunchInTime : {$gte: shiftStart}
      }
    ]).sort({userPunchInTime : -1});

    console.log('latestAttendance', latestAttendance);
    
    if(!latestAttendance){
      return 'punch-in';
    }
    if(latestAttendance.hasPunchedIn){
        return 'punch-out';
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
  
  if (userPunchIn < shiftStart) {
      return { isWithinWindow: true, isLate: false, lateBy: "0 hours 0 minutes" };
  }

  let lateBy = isLate ? Math.abs(userPunchIn - shiftStart) / (60 * 1000) : 0;

  const hours = Math.floor(lateBy / 60);
  const minutes = (lateBy % 60).toFixed(0);
  lateBy = `${hours} hours ${minutes} minutes`;

  return { isWithinWindow, isLate, lateBy };
};

const checkExistingPunch = async (employeeCode, shiftDateStart, shiftDateEnd) => {
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
};
