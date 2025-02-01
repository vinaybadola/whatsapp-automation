import AllowedWindow from "../models/allowed-window-model.js";
import AllowedWindowService from "../services/allowed-window-service.js";
import mongoose from 'mongoose';
import{paginate,paginateReturn} from "../../../helpers/pagination.js"
export default class AllowedWindowController {
    constructor() {
        this.allowedWindowService = new AllowedWindowService();
    }
    
    createAllowedWindow = async(req,res) =>{
        try{
            const data = req.body;
            await this.allowedWindowService.createAllowedWindow(data);
            return res.json(201).json({succes: true, message: 'Allowed window created successfully'});
        }
        catch(error){
            console.error(`An error occurred while creating allowed window : ${error}`);
            if(error instanceof mongoose.Error.ValidationError){
                return res.status(400).json({success: false, message: error.message});
            }
            if(error instanceof Error){
                return res.status(400).json({success: false, message: error.message});
            }

            return res.status(500).json({success: false, message: 'Internal server error'});
        }
    }

    getAllowedWindows = async(req,res) =>{
        try{
            const {skip,page,limit} = paginate(req);
            const allowedWindows = await this.allowedWindowService.getAllowedWindows(skip,limit);
            const count = await AllowedWindow.countDocuments();

            if(allowedWindows.length === 0){
                return res.status(404).json({success: false, message: 'No allowed windows found'});
            }
            return res.status(200).json({success: true, data: paginateReturn(page, limit,count, )});

        }
        catch(error){
            console.error(`An error occurred while fetching allowed windows : ${error}`);
            if(error instanceof Error){
                return res.status(400).json({success: false, message: error.message});
            }
            return res.status(500).json({success: false, message: 'Internal server error'});

        }
    }

    getAllowedWindowById = async(req,res) =>{
        try{

        }
        catch(error){

        }
    }

    updateAllowedWindow = async(req,res) =>{
        try{

        }
        catch(error){

        }
    }

    updateWindowStatus = async(req,res) =>{
        try{


        }
        catch(error){

        }
    }


}