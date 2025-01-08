import deviceListModel from '../models/device-list-model.js';

export default class DeviceListRepository {
    async createDevice(deviceData) {
        return await deviceListModel.create(deviceData);
    }

    async getDeviceList(limit, skip) {
        return await deviceListModel.find().skip(skip).limit(limit);
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
}

