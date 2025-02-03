import deviceListModel from '../models/device-list-model.js';

export default class DeviceListRepository {
    async createDevice(deviceData) {
        return await deviceListModel.create(deviceData);
    }

    async getDeviceList(limit, skip, userId) {
        const totalItems = await deviceListModel.countDocuments();
        const deviceList = await deviceListModel.find({userId}).skip(skip).limit(limit).sort({createdAt: -1});
        return {deviceList, totalItems};
    }

    async getDeviceById(deviceId) {
        return await deviceListModel.findById(deviceId);
    }

    async updateDevice(deviceId, deviceData) {
        return await deviceListModel.findByIdAndUpdate(deviceId, deviceData, {new: true});
    }

    async deleteDevice(deviceId) {
        return await deviceListModel.findByIdAndDelete(deviceId);
    }

    async getData(data) {
        return await deviceListModel.find(data);
    }
}

