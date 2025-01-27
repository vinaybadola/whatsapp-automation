import { paginate, paginateReturn } from '../../../helpers/pagination.js';
import GroupParticipants from '../models/group-participants-data-model.js';
import GroupData from '../models/user-group-data-model.js';
export default class GroupDataController {

    createGroup = async (req, res) => {
        try {
            const { groupName, groupjid, isCustomGroup = false, participants } = req.body;
            const userId = req.user._id || req.user.id;
            const group = await GroupData.create({ groupName, groupjid, isCustomGroup, userId });

            if (participants && participants.length > 0) {
                const participantsArray = participants.map((participant, index) => {
                    const sanitizedPhoneNumber = participant.phoneNumber.replace(/^\+/, '');
                    if (!/^\d{1,15}$/.test(sanitizedPhoneNumber)) {
                        throw new Error(
                            `Participant at index ${index} has an invalid phone number: ${participant.phoneNumber}`
                        );
                    }
                    return {
                        groupId: group._id,
                        name: participant.name || 'Sir/Mam',
                        phoneNumber: sanitizedPhoneNumber,
                        userId,
                    };
                });

                const data = await GroupParticipants.insertMany(participantsArray);
                return res.status(201).json({ success: true, data: data });
            }
            return res.status(201).json({ success: true, data: group });

        }
        catch (err) {
            console.error(`An error occurred while creating group in the controller : ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An error occurred while creating group : ${err.message}` });
        }
    }

    saveAllGroups = async (req, res) => {
        try {
            const { groups } = req.body;

            if (groups.length === 0) {
                throw new Error("`groups` array cannot be empty.");
            }
            groups.forEach((group, index) => {
                if (!group.name || typeof group.name !== "string") {
                    throw new Error(`Group at index ${index} is missing a valid 'name'.`);
                }
                if (!group.groupjid || typeof group.groupjid !== "string") {
                    throw new Error(`Group at index ${index} is missing a valid 'groupjid'.`);
                }
            });

            const userId = req.user._id || req.user.id;
            const groupsArray = groups.map((group) => {
                return {
                    userId: userId,
                    groupName: group.name,
                    groupjid: group.groupjid
                }
            });

            await GroupData.insertMany(groupsArray);
            return res.status(201).json({ success: true });
        }
        catch (err) {
            console.error(`An error occurred while saving all groups in the controller : ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An error occurred while saving all groups : ${err.message}` });
        }
    }

    fetchGroups = async (req, res) => {
        try {
            const { page, limit, skip } = paginate(req);
            const userId = req.user._id || req.user.id;
            const groups = await GroupParticipants.find({ userId: userId }).populate({
                path: 'groupId',
                select: 'groupName -_id', 
            }).limit(limit).skip(skip).sort({ createdAt: -1 });
            const totalItems = await GroupParticipants.countDocuments({ userId: userId });
            return res.status(200).json({
                success: true, data: groups, paginate: paginateReturn(page, limit, totalItems)
            });
        }
        catch (err) {
            console.error(`An error occurred while fetching groups in the controller : ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An error occurred while fetching groups : ${err.message}` });
        }
    }

    getGroupById = async (req, res) => {
        try {
            const { id } = req.params;
            const group = await GroupData.findById(id);
            if (!group) {
                return res.status(404).json({ success: false, error: 'Group not found' });
            }
            return res.status(200).json({ success: true, data: group });
        }
        catch (err) {
            console.error(`An error occurred while fetching group by id in the controller : ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An error occurred while fetching group by id : ${err.message}` });
        }

    }

    updateGroup = async (req, res) => {
        try {
            const { id } = req.params;
            const group = await GroupData.findByIdAndUpdate(id, req.body, { new: true });
            if (!group) {
                return res.status(404).json({ success: false, error: 'Group not found' });
            }
            return res.status(200).json({ success: true, data: group });
        }
        catch (err) {
            console.error(`An error occurred while updating group in the controller : ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An error occurred while updating group : ${err.message}` });
        }
    }

    deleteGroup = async (req, res) => {
        try {
            const { id } = req.body;
            const group = await GroupData.findByIdAndDelete(id);
            if (!group) {
                return res.status(404).json({ success: false, error: 'Group not found' });
            }
            return res.status(200).json({ success: true, data: group });
        }
        catch (err) {
            console.error(`An error occurred while deleting group in the controller : ${err.message}`);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An error occurred while deleting group : ${err.message}` });
        }
    }
}

