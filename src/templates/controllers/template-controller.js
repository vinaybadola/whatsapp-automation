import Template from "../models/template-model.js";
import { paginate, paginateReturn } from '../../../helpers/pagination.js';

export default class TemplateController {
    createTemplate = async (req, res) => {
        try {
            const { subject, template, templateType, placeholders, groupConfigurationId,shouldBeSentToGroup } = req.body;
            const existingTemplate = await Template.findOne({ templateType });
            if (existingTemplate) {
                return res.status(400).json({ success: false, message: "Template type already exists" });
            }
            const newTemplate = new Template({ subject, template, templateType, placeholders , groupConfigurationId, shouldBeSentToGroup });
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

    getAllTemplate = async (req, res) => {
        try {
            const { page, limit, skip } = paginate(req);
            const isActive = req.query.isActive === 'false' ? false : true;
            const templates = await Template.find({ isActive }).limit(limit).skip(skip);
            const total = await Template.countDocuments({ isActive });
            const currentPageTotal = templates.length;

            if (templates.length === 0) {
                return res.status(404).json({ success: false, message: "Templates not found" });
            }
            res.status(200).json({ success: true, data: templates, paginate: paginateReturn(page, limit, total, currentPageTotal) });
        } catch (err) {
            console.log("An error occurred while fetching all templates: ", err.message);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res
                .status(500)
                .json({ success: false, message: "Internal Server Error", error: err.message });
        }
    };

    getTemplate = async (req, res) => {
        try {
            const { id } = req.params;
            const template = await Template.findById(id);

            if (!template) {
                return res
                    .status(404)
                    .json({ success: false, message: "Template not found" });
            }

            res.status(200).json({ success: true, data: template });
        } catch (err) {
            console.log("An error occurred while fetching the template: ", err.message);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
        }
    };

    updateTemplate = async (req, res) => {
        try {
            const { id } = req.params;
            const { subject, template, templateType, isActive, placeholders, groupConfigurationId, shouldBeSentToGroup } = req.body;

            // Check if a template with the same templateType exists and is not the current template
            const existingTemplate = await Template.findOne({
                templateType,
                _id: { $ne: id },
            });

            if (existingTemplate) {
                return res.status(400).json({ success: false, message: 'Template type already exists' });
            }

            const updatedTemplate = await Template.findByIdAndUpdate(
                id,
                { subject, template, templateType, isActive, placeholders, groupConfigurationId, shouldBeSentToGroup },
                { new: true, runValidators: true }
            );

            if (!updatedTemplate) {
                return res
                    .status(404)
                    .json({ success: false, message: "Template not found" });
            }

            res.status(200).json({ success: true, data: updatedTemplate });
        } catch (err) {
            console.log("An error occurred while updating the template: ", err.message);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
        }
    };

    deleteTemplate = async (req, res) => {
        try {
            const { id } = req.params;
            const deletedTemplate = await Template.findByIdAndDelete(id);

            if (!deletedTemplate) {
                return res.status(404).json({ success: false, message: "Template not found" });
            }

            res.status(200).json({ success: true, message: "Template deleted successfully" });
        } catch (err) {
            console.log("An error occurred while deleting the template: ", err.message);
            if (err instanceof Error) {
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
        }
    };
}
