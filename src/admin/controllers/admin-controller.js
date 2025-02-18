import { paginate, paginateReturn } from "../../../helpers/pagination.js";
import DeviceListModel from "../../devices/models/device-list-model.js";
import Template from "../../templates/models/template-model.js";
import DeviceListServices from '../../devices/services/device-list-services.js';
import { errorResponseHandler } from '../../../helpers/data-validation.js';
import UserService from "../../users/services/user-service.js";
import UserRepository from "../../users/repositories/user-repository.js";
import messageTrackerModel from "../../messageTracker/models/message-tracker-model.js";

export default class AdminController {
    constructor() {
        this.deviceListServices = new DeviceListServices();
        this.userRepository = new UserRepository();
        this.userService = new UserService(this.userRepository);
    }

    getDevices = async (req, res) => {
        try {
            const { page, limit } = req.query;
            const { start, end } = paginate(page, limit);
            const devices = await DeviceListModel.find().skip(start).limit(end);
            const total = await DeviceListModel.countDocuments();
            if (devices.length === 0) {
                return errorResponseHandler('No devices found', 404, res);
            }

            const data = paginateReturn(devices, page, limit, total);
            return res.status(200).json(data);
        }
        catch (error) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            const status = err instanceof Error ? 400 : 500;
            return errorResponseHandler(message, status, res);
        }
    }

    updateDevice = async (req, res) => {
        try {
            const { deviceId } = req.params;
            const device = await DeviceListModel.findByIdAndUpdate(deviceId, req.body, { new: true });
            if (!device) {
                throw new Error("Device not found");
            }
            return res.status(200).json({ success: true, data: device });
        }
        catch (error) {
            console.log(`An unexpected Error occurred while updating device : ${error.message}`);
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error });
        }
    }

    deleteDevice = async (req, res) => {
        try {
            const { deviceId } = req.body;
            const device = await DeviceListModel.findByIdAndDelete(deviceId);
            if (!device) {
                return errorResponseHandler('Device not found', 404, res);
            }   
            return res.status(200).json({ success: true, message: 'Device deleted successfully' });
        }
        catch(error){
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            const status = err instanceof Error ? 400 : 500;
            return errorResponseHandler(message, status, res);
        }

    }

    getDeviceDetails = async (req, res) => {
        try {
            const { deviceId } = req.params;
            const device = await DeviceListModel.findById(deviceId);
            if (!device) {
                throw new Error("Device not found");
            }
            return res.status(200).json({ success: true, data: device });
        }
        catch (error) {
            console.log(`An unexpected Error occurred while fetching device details : ${error.message}`);
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error });
        }
    }

    getTemplates = async (req, res) => {
        try {
            const { page, limit } = req.query;
            const { start, end } = paginate(page, limit);
            const templates = await Template.find().skip(start).limit(end);
            const total = await Template.countDocuments();
            const data = paginateReturn(templates, page, limit, total);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`An unexpected Error occurred while fetching templates : ${error.message}`);
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error });
        }
    }

    updateTemplate = async (req, res) => {
        try {
            const { templateId } = req.params;
            const template = await Template.findByIdAndUpdate(templateId, req.body, { new: true });
            if (!template) {
                throw new Error("Template not found");
            }
            return res.status(200).json({ success: true, data: template });
        }
        catch (error) {
            console.log(`An unexpected Error occurred while updating template : ${error.message}`);
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error });
        }
    }

    getTemplateDetails = async (req, res) => {
        try {
            const { templateId } = req.params;
            const template = await Template.findById(templateId);
            if (!template) {
                throw new Error("Template not found");
            }
            return res.status(200).json({ success: true, data: template });
        }
        catch (error) {
            console.log(`An unexpected Error occurred while fetching template details : ${error.message}`);
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error });
        }
    }

    createTemplate = async (req, res) => {
        try {
            const { subject, template, templateType, placeholders, groupConfigurationId, shouldBeSentToGroup } = req.body;
            const existingTemplate = await Template.findOne({ templateType });
            if (existingTemplate) {
                return res.status(400).json({ success: false, message: "Template type already exists" });
            }
            const newTemplate = new Template({ subject, template, templateType, placeholders, groupConfigurationId, shouldBeSentToGroup });
            await newTemplate.save();
            res.status(201).json({ success: true, data: newTemplate });
        } catch (err) {
            console.log(`An unexpected error occurred while creating Template: ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
        }
    };

    getAllUsers = async (req, res) => {
        try {
            const { page, limit, skip } = paginate(req);
            const users = await this.userService.getAllUsers(skip, limit);

            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'No users found' });
            }

            return res.status(200).json({ success: true, message: 'Users retrieved successfully', data: users, pagination: paginateReturn(page, limit, users.length) });
        }
        catch (error) {
            console.error(`An unexpected error occurred while getting all users: ${error.message}`);
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
    }

    changeUserRole = async (req, res) => {
        try {
            const { userId, roleId } = req.body;
            await this.userService.changeUserRole(userId, roleId);
            return res.status(200).json({ success: true, message: 'User role updated successfully ' });
        }
        catch (err) {
            console.error(`An unexpected error occurred while changing user role: ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: 'An unexpected error occurred ' });
        }
    }

    createRole = async (req, res) => {
        try {
            await this.userService.createRole(req.body);
            return res.status(200).json({ success: true, message: 'Role created successfully' });
        }
        catch (err) {
            console.error(`An unexpected error occurred while creating role: ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred while creating role : ${err.message}` });
        }
    }

    getAllRoles = async (req, res) => {
        try {
            const { page = 1, limit = 10 } = paginate(req);
            const roles = await this.userService.getRoles(page, limit);
            const totalItems = roles.length;
            if (!totalItems) {
                return res.status(404).json({ success: false, message: 'No roles found' });
            }
            return res.status(200).json({
                success: true, message: 'Roles retrieved successfully',
                data: roles,
                pagination: {
                    paginate: paginateReturn(page, limit, totalItems)
                }
            });
        }
        catch (err) {
            console.error(`An unexpected error occurred while getting all roles: ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred : ${err.message}` });
        }

    }

    getRoleById = async (req, res) => {
        try {
            const id = req.params.id;
            const role = await this.userService.getRoleById(id);
            if (!role) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            return res.status(200).json({ success: true, message: 'Role retrieved successfully', data: role });
        }
        catch (err) {
            console.error(`An unexpected error occurred while getting role by id: ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred while getting role by id : ${err.message}` });
        }
    }

    updateRole = async (req, res) => {
        try {
            const id = req.params.id;
            const role = await this.userService.updateRole(id, req.body);
            if (!role) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            return res.status(200).json({ success: true, message: 'Role updated successfully', data: role });
        }
        catch (err) {
            console.error(`An unexpected error occurred while updating role: ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred while updating role : ${err.message}` });
        }
    }
    // api for getting all the message send from the particular device 
    getMessagesForParticularDevice = async (req, res) => {
        try {
            const { senderId } = req.params;
            const { page, limit, skip } = paginate(req);
            const { status = "sent" } = req.query;
            const messages = await messageTrackerModel.find({ senderId, status }).skip(skip).limit(limit);
            const totalItems = messages.length;
            if (!totalItems) {
                return errorResponseHandler('No messages found', 404, res);
            }
            return res.status(200).json({ success: true, message: 'Messages retrieved successfully', data: messages, pagination: paginateReturn(page, limit, totalItems) });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            const status = err instanceof Error ? 400 : 500;
            return errorResponseHandler(message, status, res);
        }
    }
}