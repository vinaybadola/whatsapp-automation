import UserAttendance from "../models/user-attendance-model.js";
import {paginate, paginateReturn} from '../../../helpers/pagination.js';
import {errorResponseHandler} from '../../../helpers/data-validation.js';

export default class UserAttendanceController {
    
    getUserAttendanceData = async (req, res) => {
        // get the employee attendance on the day wise, week wise, month wise, year wise and custom date range wise

    };

    updateUserAttendanceData = async (req, res) => {
        // update the employee attendance data only 5 days prior to the current date

    };

    getAllUserAttendanceData = async (req, res) => {
        // get all the employee attendance data

    }

    addUserAttendanceData = async (req, res) => {
        // add the employee attendance data

    }

}