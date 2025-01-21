import { paginate, paginateReturn} from '../../../helpers/pagination.js';
import GroupParticipants from '../models/group-participants-data-model.js';
import GroupData from '../models/user-group-data-model.js';

export default class GroupDataController{

    createGroup = async(req,res)=> {
        try{
            const userId = req.user._id || req.user.id;
            const groupNames = req.body.groupNames;
            const isCustomGroup = req.body.isCustomGroup || false;
            const participants = req.body.participants;
            const groupjids = req.body.groupjids;

            const group = await GroupData.create({groupName: groupNames,  userId: userId, isCustomGroup: isCustomGroup, groupjid: groupjids});

            if(!group){
                return res.status(400).json({success: false, error: 'Error creating group'});
            }

            const groupParticipants = participants.map(participant => {
                return {
                    groupId: group._id,
                    userId: userId,
                    phoneNumber: participant.phoneNumber,
                    name: participant.name || 'Sir/Madam',
                    email: participant.email
                }
            });

            const participantsData = await GroupParticipants.insertMany(groupParticipants);
            if(!participantsData){
                return res.status(400).json({success: false, error: 'Error creating group participants'});
            }
            return res.status(201).json({success: true, message: 'Group created successfully'});

        }
        catch(err){
            console.error(`An error occurred while creating group in the controller : ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({success: false, error: `An error occurred while creating group : ${err.message}`});
        }
    }

    fetchGroups = async(req,res) =>{
        try{
            const {page, limit} = paginate(req);
            const userId = req.user._id || req.user.id;
            const groups = await GroupParticipants.find({userId: userId}).populate('groupId , groupName, groupjid').limit(limit).skip(page);
            const totalItems = await GroupParticipants.countDocuments({userId: userId});
            return res.status(200).json({success: true,data: groups,paginate : paginateReturn(page, limit, totalItems)
            });
        }
        catch(err){
            console.error(`An error occurred while fetching groups in the controller : ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({success: false, error: `An error occurred while fetching groups : ${err.message}`});
        }
    }

}

