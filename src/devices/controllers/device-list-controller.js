import DeviceListServices from '../services/device-list-services.js';
import UserRepository from '../../users/repositories/user-repository.js';
import DeviceListRepository from '../repositories/device-list-repository.js';
import {log} from '../../../utils/logger.js';
import { paginate, paginateReturn} from '../../../helpers/pagination.js';

export default class DeviceListController {
    constructor() {
        this.deviceListRepository = new DeviceListRepository();
        this.deviceListServices = new DeviceListServices(this.deviceListRepository, new UserRepository());

    }

    createDevice = async(req,res) =>{
        try{
            const deviceData = req.body;
            deviceData.userId = req.user._id || req.user.id;
            const newDevice = await this.deviceListServices.createDevice(deviceData);
            if(!newDevice){
                return this.errorResponseHandler('Error creating device', 400, res);
            }
            return res.status(201).json({success: true, message: 'Device created successfully', data: newDevice});
        }
        catch(err){
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            const status = err instanceof Error ? 400 : 500;
            return this.errorResponseHandler(message, status, res);
        }
    }

    getDeviceList = async(req,res) =>{
        try{
            const {page, limit, skip} = paginate(req);
            const userId = req.user?._id || req.user?.id;
            const {deviceList, totalItems, currentPageTotal} = await this.deviceListServices.getDeviceList(limit, skip, userId);
            if(!deviceList){
                return this.errorResponseHandler('Error getting device list', 400, res);
            }
            return res.status(200).json({success: true, message: 'Device list fetched successfully', 
                data: deviceList, 
                paginate : paginateReturn(page, limit, totalItems, currentPageTotal)
            });
        }
        catch(err){
            if(err instanceof Error){
                return this.errorResponseHandler(err.message, 400, res);
            }
            return this.errorResponseHandler('Error getting device list', 500, res);
        }
    }

    getDevice = async(req,res) =>{
        try{
            const deviceId = req.params.deviceId;
            const device = await this.deviceListServices.getDeviceById(deviceId);
            if(!device){
                return this.errorResponseHandler('Error getting device', 400, res);
            }
            return res.status(200).json({success: true, message: 'Device fetched successfully', data: device});
        }
        catch(err){
            if(err instanceof Error){
                return this.errorResponseHandler(err.message, 400, res);
            }
            return this.errorResponseHandler('Error getting device', 500, res);
        }
    }

    updateDevice = async(req,res) =>{
        try{
            const deviceId = req.params.deviceId;
            const deviceData = req.body;
            const updatedDevice = await this.deviceListServices.updateDevice(deviceId, deviceData);
            if(!updatedDevice){
                return this.errorResponseHandler('Error updating device', 400, res);
            }
            return res.status(200).json({success: true, message: 'Device updated successfully', data: updatedDevice});
        }
        catch(err){
            if(err instanceof Error){
                return this.errorResponseHandler(err.message, 400, res);
            }
            return this.errorResponseHandler('Error updating device', 500, res);
        }
    }

    deleteDevice = async(req,res) =>{
        try{
            const deviceId = req.params.deviceId;
            const deletedDevice = await this.deviceListServices.deleteDevice(deviceId);
            if(!deletedDevice){
                return this.errorResponseHandler('Error deleting device', 400, res);
            }
            return res.status(200).json({success: true, message: 'Device deleted successfully', data: deletedDevice});
        }
        catch(err){
            if(err instanceof Error){
                return this.errorResponseHandler(err.message, 400, res);
            }
            return this.errorResponseHandler('Error deleting device', 500, res);
        }
    }

    errorResponseHandler(errorMessage, ErrorStatusCode, res){
        log.error(`Error: ${errorMessage}`);
        return res.status(ErrorStatusCode).json({success: false,message: errorMessage });
    }
}