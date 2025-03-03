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
  // if the isNightShift is false then check for today's date punch only 
  if(!isNightShift){
    const shiftDateStr = new Date(userDateTime).toISOString().split('T')[0];
    const shiftDateStart = new Date(shiftDateStr);
    const shiftDateEnd = new Date(shiftDateStr);
    shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

    const latestAttendance = await UserAttendance.findOne({
      employeeCode,
      userpunchInTime: { $gte: shiftDateStart, $lt: shiftDateEnd }
    });

    console.log('latestAttendance', latestAttendance);
  
    if (latestAttendance) {
      return 'punch-out';
    }
  }

  if(isNightShift){
    // if Employee is working in night shift then 
    /**
     * condition can be : if we start our attendance service today and we know there is no record previously 
     * so night shift employee punch in at 20:00 we'll find out that he has no punch in record for today
     * we'll check for buffer time of 45 minutes if he punch in after 45 minutes then we'll consider it as punch-in
     * so hasPunchedIn will be true and hasPunchedOut will be false and isValidPunch will be false
     * if he again try to punch in at 21:00 then we'll find out that he has already punched in 
     * so we'll consider it as punch-out and so hasPunchedIn will be true and hasPunchedOut will be true and isValidPunch will be true also but will add that into defaulter list
     * but if he again punch at shift end time then we'll oveeride the previous punch out time and will update the punch out time
     * so hasPunchedIn will be true and hasPunchedOut will be true and isValidPunch will be true also and also he'll remove from defaulter list
     * 
     * Take the condition this also if we start our attendance service after night shift employee starts their shift and now it's 05:00 and they choose to punch-out 
     * so we'll check if there is any record for today if not then we have to consider that as punch-out if the shift start time is before the current time and we'll set the hasPunched in
     * false and hasPunchedOut true and isValidPunch false because he doesn't have any punch in record for today
     * 
     * Now second day comes he again comes at his shift time and punch at 20:00 then we'll find if he has already punched in or not
     * we'll find with the condition if isValidPunch is false and hasPunchedIn is false and hasPunchedOut is false if these things are not true then we'll consider that as punch-in 
     * as we have no records for today so it's a next day and a fresh data will be persist into the database
     * 
     */
    // add yesterday's date to the now date

    let now = new Date();
    now.setHours(now.getHours() - 24); // Set to yesterday
    now.setHours(21, 0, 0, 0); // Set to 9:00 PM
    
    now.setHours(now.getHours() + 5, 30);

    console.log('now', now);

    const fifteenHoursAgo = new Date(now.getTime() - 15 * 60 * 60 * 1000); 
    console.log('fifteenHoursAgo', fifteenHoursAgo);
    // let now = new Date();
    // const fifteenHoursAgo = new Date(now.getTime() - 15 * 60 * 60 * 1000);

    const latestAttendance = await UserAttendance.findOne({
      employeeCode,
      $or: [
        { userpunchInTime: { $gte: fifteenHoursAgo, $lt: now } },
        { userPunchOutTime: { $gte: fifteenHoursAgo, $lt: now } }
      ],
    }).sort({ createdAt: -1 });

    console.log('latestAttendance', latestAttendance);

    if(latestAttendance){
      // if user punched in and not punched out then it's a punch-out
      if(latestAttendance.hasPunchedIn && !latestAttendance.hasPunchedOut){
        return 'punch-out';
      }

      // For overriding the punch out time if user punch out mistakenly
      if(latestAttendance.hasPunchedIn && latestAttendance.hasPunchedOut){
        return 'punch-out';
      }
    }
    
    if(!latestAttendance){
      return 'punch-in';
    }
    else{
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
export {
  parseShiftTime,
  determinePunchType,
  checkPunchOutValidity,
  calculateAllowedWindow,
  checkPunchInValidity,
};
