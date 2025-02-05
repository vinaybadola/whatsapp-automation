import groupConfigurationModel from "../models/group-configuration-model.js";
import {paginate, paginateReturn} from "../../../helpers/pagination.js"
export default class GroupConfigurationController {

    create = async(req,res)=>{
        try{
            const{name} = req.body;
            const existingGroupConfiguration = await groupConfigurationModel.findOne({name});

            if(existingGroupConfiguration){
                return res.status(400).json({message:"Group configuration already exists"});
            }

            const groupConfiguration = new groupConfigurationModel(req.body);
            await groupConfiguration.save();
            res.status(201).json({message:"Group configuration created successfully"});
        }
        catch(err){
            console.log(`Error in GroupConfigurationController.create: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({ success:false, error: `Bad request: ${err.message}`});
            }
            return res.status(500).json({ success:false, error:`Internal server error: ${err.message}`});
        }
    }

    get = async(req,res)=>{
        try{
            const {id} = req.params;
            const groupConfiguration = await groupConfigurationModel.findById(id).select("-__v -createdAt -updatedAt")
            .populate('templateId', 'template')

            if(!groupConfiguration){
                return res.status(404).json({ success: false, message:"Group configuration not found"});
            }
            return res.status(200).json({ success: true,data: groupConfiguration});
        }
        catch(error){
            console.log(`Error in GroupConfigurationController.get: ${error.message}`);
            if(error instanceof Error){
                return res.status(400).json({ success:false, error: `Bad request: ${error.message}`});
            }
            return res.status(500).json({ success:false, error:`Internal server error: ${error.message}`});
        }
    }

    getAll = async(req,res)=>{
        try{
            const {page, limit, skip} = paginate(req);
            const groupConfigurations = await groupConfigurationModel.find().skip(skip).limit(limit);

            if(groupConfigurations.length === 0){
                return res.status(404).json({success: false, error: 'Group configurations not found'});
            }

            const count = await groupConfigurationModel.countDocuments();
            return res.status(200).json({success: true, data: groupConfigurations, paginate : paginateReturn(page, limit, count, groupConfigurations.length)});
        }
        catch(error){
            console.log(`Error in GroupConfigurationController.getAll: ${error.message}`);
            if(error instanceof Error){
                return res.status(400).json({ success:false, error: `Bad request: ${error.message}`});
            }
            return res.status(500).json({ success:false, error:`Internal server error: ${error.message}`});
        }
    }
    
    update = async(req,res)=>{
        try{
            const {id} = req.params;
            const groupConfiguration = await groupConfigurationModel.findById(id);
            if(!groupConfiguration){
                return res.status(404).json({ success: false, message:"Group configuration not found"});
            }
            await groupConfigurationModel.findByIdAndUpdate(id, req.body);
            return res.status(200).json({ success: true, message:"Group configuration updated successfully"});

        }
        catch(err){
            console.log(`Error in GroupConfigurationController.update: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({ success:false, error: `Bad request: ${err.message}`});
            }
            return res.status(500).json({ success:false, error:`Internal server error: ${err.message}`});
        }
    }

    delete = async(req,res)=>{
        try{
            const {id} = req.params;
            const groupConfiguration = await groupConfigurationModel.findById(id);
            if(!groupConfiguration){
                return res.status(404).json({ success: false, message:"Group configuration not found"});
            }
            await groupConfigurationModel.findByIdAndDelete(id);
            return res.status(200).json({ success: true, message:"Group configuration deleted successfully"});
        }
        catch(err){
            console.log(`Error in GroupConfigurationController.delete: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({ success:false, error: `Bad request: ${err.message}`});
            }
            return res.status(500).json({ success:false, error:`Internal server error: ${err.message}`});
        }
    }
}