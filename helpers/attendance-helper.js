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

const determinePunchType = (userDateTime, shiftStart, shiftEnd) => {
    const timeToStart = Math.abs(userDateTime - shiftStart); 
    const timeToEnd = Math.abs(userDateTime - shiftEnd); 
    return timeToStart < timeToEnd ? "punch-in" : "punch-out";
};

const checkPunchOutValidity = (userPunchOut, shiftEnd) => {
    const isLeavingEarly = userPunchOut < shiftEnd;
    const isLate = userPunchOut > shiftEnd;
    const earlyBy = isLeavingEarly ? Math.abs(shiftEnd - userPunchOut)/ (60 * 1000) : 0;
    return { isLeavingEarly, isLate, earlyBy};
};

const calculateAllowedWindow = (shiftStart) => ({
    allowedPunchInStart: new Date(shiftStart.getTime() - 60 * 60 * 1000), // 1 hour before
    allowedPunchInEnd: new Date(shiftStart.getTime() + 3 * 60 * 60 * 1000), // 3 hours after
  });

const checkPunchInValidity = (userPunchIn, shiftStart, allowedPunchInStart, allowedPunchInEnd) => {
    const isWithinWindow = userPunchIn >= allowedPunchInStart && userPunchIn <= allowedPunchInEnd;
    const isLate = isWithinWindow && userPunchIn > shiftStart;
    const lateBy = isLate ? Math.abs(userPunchIn - shiftStart) / (60 * 1000) : 0;

  return { isWithinWindow, isLate, lateBy };
};

export {
    parseShiftTime,
    determinePunchType,
    checkPunchOutValidity,
    calculateAllowedWindow,
    checkPunchInValidity,
};
