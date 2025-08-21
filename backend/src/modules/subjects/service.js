import { Subject, Question, Test, User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class SubjectService {

    // Create a new subject
    async createSubject(subjectData, ownerId, createdBy) {
        logger.info(`Creating subject for owner: ${ownerId}`);

        try {
            // Validate creator permissions
            const creator = await User.findById(createdBy);
            if (!creator) {
                throw new Error('Creator not found');
            }

            // Validate ownership
            let validOwnerRelation = false;
            if (creator.role === 'test_center_owner') {
                validOwnerRelation = creator._id.toString() === ownerId.toString();
            } else if (creator.role === 'test_creator') {
                validOwnerRelation = creator.testCenterOwner &&
                    creator.testCenterOwner.toString() === ownerId.toString();
            }
            if (!validOwnerRelation) {
                throw new Error('User does not have permission to create subjects for this test center');
            }

            // Check for duplicate subject name
            const existingSubject = await Subject.findOne({
                testCenterOwner: ownerId,
                name: { $regex: new RegExp(`^${subjectData.name}$`, 'i') },
                isActive: true
            });

            if (existingSubject) {
                throw new Error('A subject with this name already exists');
            }

            // Create subject
            const subject = new Subject({
                ...subjectData,
                testCenterOwner: ownerId,
                createdBy: createdBy
            });

            await subject.save();

            // Populate creator info for response
            await subject.populate('createdBy', 'firstName lastName email');

            logger.info(`Subject created successfully: ${subject._id}`);
            return subject;

        } catch (error) {
            logger.error('Failed to create subject:', error);
            throw error;
        }
    }

    // Get all subjects for a test center
    async getSubjectsByOwner(ownerId, options = {}) {
        logger.info(`Getting subjects for owner: ${ownerId}`);

        try {
            const {
                page = 1,
                limit = 50,
                category,
                search,
                sort = 'order'
            } = options;

            const skip = (page - 1) * limit;

            const subjects = await Subject.findByOwner(ownerId, {
                category,
                search,
                sort: { [sort]: 1, name: 1 },
                limit: parseInt(limit),
                skip: parseInt(skip)
            });

            const total = await Subject.countDocuments({
                testCenterOwner: ownerId,
                isActive: true,
                ...(category && { category }),
                ...(search && { $text: { $search: search } })
            });

            return {
                subjects,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Failed to get subjects:', error);
            throw error;
        }
    }

    // Get single subject by ID
    async getSubjectById(subjectId, ownerId) {
        logger.info(`Getting subject: ${subjectId} for owner: ${ownerId}`);

        try {
            const subject = await Subject.findOne({
                _id: subjectId,
                testCenterOwner: ownerId,
                isActive: true
            }).populate([
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);

            if (!subject) {
                throw new Error('Subject not found or access denied');
            }

            // Get additional statistics
            const questionStats = await subject.getQuestionsByDifficulty();
            const recentQuestions = await subject.getQuestionsWithFilter({
                limit: 5,
                sort: { createdAt: -1 }
            });

            return {
                ...subject.toObject(),
                questionStats,
                recentQuestions
            };

        } catch (error) {
            logger.error('Failed to get subject:', error);
            throw error;
        }
    }

    // Update subject
    async updateSubject(subjectId, updateData, ownerId) {
        logger.info(`Updating subject: ${subjectId}`);

        try {
            const subject = await Subject.findOne({
                _id: subjectId,
                testCenterOwner: ownerId,
                isActive: true
            });

            if (!subject) {
                throw new Error('Subject not found or access denied');
            }

            // Check for duplicate name if name is being updated
            if (updateData.name && updateData.name !== subject.name) {
                const existingSubject = await Subject.findOne({
                    testCenterOwner: ownerId,
                    name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
                    isActive: true,
                    _id: { $ne: subjectId }
                });

                if (existingSubject) {
                    throw new Error('A subject with this name already exists');
                }
            }

            // Update subject
            Object.assign(subject, updateData);
            await subject.save();

            // Update statistics
            await subject.updateStats();

            // Populate for response
            await subject.populate('createdBy', 'firstName lastName email');

            logger.info(`Subject updated successfully: ${subjectId}`);
            return subject;

        } catch (error) {
            logger.error('Failed to update subject:', error);
            throw error;
        }
    }

    // Delete subject (soft delete)
    async deleteSubject(subjectId, ownerId) {
        logger.info(`Deleting subject: ${subjectId}`);

        try {
            const subject = await Subject.findOne({
                _id: subjectId,
                testCenterOwner: ownerId,
                isActive: true
            });

            if (!subject) {
                throw new Error('Subject not found or access denied');
            }

            // Check if subject can be deleted
            const canDelete = await subject.canBeDeleted();
            if (!canDelete) {
                throw new Error('Cannot delete subject: it has active questions or is used in active tests');
            }

            // Soft delete the subject
            subject.isActive = false;
            await subject.save();

            // Also soft delete associated questions
            await Question.updateMany(
                { subject: subjectId, testCenterOwner: ownerId },
                { isActive: false }
            );

            logger.info(`Subject deleted successfully: ${subjectId}`);
            return { success: true, message: 'Subject deleted successfully' };

        } catch (error) {
            logger.error('Failed to delete subject:', error);
            throw error;
        }
    }

    // Get subject categories
    async getCategories(ownerId) {
        logger.info(`Getting categories for owner: ${ownerId}`);

        try {
            const categories = await Subject.getCategories(ownerId);
            return categories;

        } catch (error) {
            logger.error('Failed to get categories:', error);
            throw error;
        }
    }

    // Update subject order (for drag-and-drop reordering)
    async updateSubjectOrder(ownerId, orderUpdates) {
        logger.info(`Updating subject order for owner: ${ownerId}`);

        try {
            const result = await Subject.bulkUpdateOrder(ownerId, orderUpdates);

            logger.info(`Subject order updated successfully`);
            return { success: true, message: 'Subject order updated successfully', modifiedCount: result.modifiedCount };

        } catch (error) {
            logger.error('Failed to update subject order:', error);
            throw error;
        }
    }

    // Create default subjects for new test centers
    async createDefaultSubjects(ownerId, createdBy) {
        logger.info(`Creating default subjects for owner: ${ownerId}`);

        try {
            const subjects = await Subject.createDefault(ownerId, createdBy);

            logger.info(`Default subjects created successfully`);
            return subjects;

        } catch (error) {
            logger.error('Failed to create default subjects:', error);
            throw error;
        }
    }

    // Get subject statistics
    async getSubjectStatistics(ownerId) {
        logger.info(`Getting subject statistics for owner: ${ownerId}`);

        try {
            const stats = await Subject.getSubjectStats(ownerId);

            const summary = {
                totalSubjects: 0,
                totalQuestions: 0,
                totalTests: 0,
                categoriesBreakdown: {}
            };

            stats.forEach(stat => {
                summary.totalSubjects += stat.count;
                summary.totalQuestions += stat.totalQuestions;
                summary.totalTests += stat.totalTests;
                summary.categoriesBreakdown[stat._id] = {
                    subjects: stat.count,
                    questions: stat.totalQuestions,
                    tests: stat.totalTests
                };
            });

            return summary;

        } catch (error) {
            logger.error('Failed to get subject statistics:', error);
            throw error;
        }
    }
}

// Create singleton instance
const subjectService = new SubjectService();

export { subjectService };
