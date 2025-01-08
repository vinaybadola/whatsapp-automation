export default class DeviceListServices{

    /**
     * 
     * @param {DeviceListRepository} deviceListRepository 
     * @returns {DeviceListServices} 
     * 
     */
    constructor(deviceListRepository, userRepository){
        this.deviceListRepository = deviceListRepository;
        this.userRepository = userRepository;
    }

    /**
     * 
     * @param {*} deviceData 
     * @returns  {Promise<DeviceList>}
     */

    async createDevice(deviceData){
        try{
            if(!deviceData.userId){
                throw new Error('Empty user id while creating device in service class');
            }

            const getUserById = await this.userRepository.getUserById(deviceData.userId);
            if(!getUserById){
                throw new Error('User not found');
            }

            const newDevice = await this.deviceListRepository.createDevice(deviceData);
            return newDevice;
        }catch(err){
            throw new Error(`Error creating device: ${err.message}`);
        }
    }

    /**
     * 
     * @returns {Promise<DeviceList>}
     * @param {*} skip
     * @param {*} limit
     */

    async getDeviceList(limit, skip){
        try{
            return await this.deviceListRepository.getDeviceList(limit, skip);
        }catch(err){
            throw new Error(`Error getting device list: ${err.message}`);
        }
    }

    /**
     * @param {*} deviceId>}
     * 
     * 
     */

    async getDeviceById(deviceId){
        try{
            return await this.deviceListRepository.getDeviceById(deviceId);
        }catch(err){
            throw new Error(`Error getting device by id: ${err.message}`);
        }
    }

    /**
     * 
     * @param {*} deviceId 
     * @param {*} deviceData 
     * @returns {Promise<DeviceList>}
     */

    async updateDevice(deviceId, deviceData){
        try{
            return await this.deviceListRepository.updateDevice(deviceId, deviceData);
        }catch(err){
            throw new Error(`Error updating device: ${err.message}`);
        }
    }

    /**
     * 
     * @param {*} deviceId 
     * @returns {Promise<DeviceList>}
     */

    async deleteDevice(deviceId){
        try{
            return await this.deviceListRepository.deleteDevice(deviceId);
        }catch(err){
            throw new Error(`Error deleting device: ${err.message}`);
        }
    }

}