import messageTrackerModel from "../models/message-tracker-model.js";
import {paginate, paginateReturn} from "../../../helpers/pagination.js";

export default class MessageTrackerController {

    getData = async(req,res)=>{
        try{
            const {page, limit, skip} = paginate(req);
            const userId = req.user.id || req.user._id;

            const data = await messageTrackerModel.find({userId}).skip(skip).limit(limit).sort({createdAt : -1});
            const total = await messageTrackerModel.countDocuments({userId});
            if(total === 0){
                return res.status(404).json({success: false, message: "Data not found"});
            }

            const pagination = paginateReturn(data, page, limit, total);
            return res.status(200).json({success: true,data : data, pagination});
        }
        catch(error){
            console.log(`An error occurred at while fetching data from outbox: ${error.message}`);
            if(error instanceof Error){
                return res.json({success: false, message: error.message});
            }
            return res.json({success: false, error : `An error occurred while fetching data for outbox : ${error}`});

        }
    }

    deleteData = async(req,res)=>{
        try{
            const {id} = req.params;
            const data = await messageTrackerModel.findByIdAndDelete(id);
            if(!data){
                return res.status(404).json({success: false, message: "Data not found"});
            }
            return res.status(200).json({success: true, message: "Data deleted successfully"});
        }
        catch(error){

            console.log(`An error occurred at while deleting data from outbox: ${error}`);
            if(err instanceof Error){
                return res.json({success: false, message: error.message});
            }
            return res.json({success: false, error : `An error occurred while deleting data for outbox : ${error.message}`});
        }
    }

    getDataById = async(req,res)=>{
        try{
            const {id} = req.params;
            const data = await messageTrackerModel.findById(id);
            if(!data){
                return res.status(404).json({success: false, message: "Data not found"});
            }
            return res.status(200).json({success: true, data});
        }
        catch(error){
            console.log(`An error occurred at while fetching data from outbox by id: ${error.message}`);
            if(error instanceof Error){
                return res.json({success: false, message: error.message});
            }
            return res.json({success: false, error : `An error occurred while fetching data for outbox by id: ${error.message}`});
        }
    }
}