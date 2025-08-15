class UserService {
    constructor(logger, database) {
        this.logger = logger;
        this.database = database;
    }

    async findById(id) {
        this.logger.info(`Finding user by id: ${id}`);
        // Implementation using this.database
        return await this.database.users.findById(id);
    }

    async findByEmail(email) {
        this.logger.info(`Finding user by email: ${email}`);
        return await this.database.users.findOne({ email });
    }

    async create(userData) {
        this.logger.info('Creating new user');
        return await this.database.users.create(userData);
    }

    async update(id, updateData) {
        this.logger.info(`Updating user: ${id}`);
        return await this.database.users.findByIdAndUpdate(id, updateData, { new: true });
    }

    async delete(id) {
        this.logger.info(`Deleting user: ${id}`);
        return await this.database.users.findByIdAndDelete(id);
    }

    async listUsers(filters = {}) {
        this.logger.info('Listing users with filters:', filters);
        return await this.database.users.find(filters);
    }
}

module.exports = { UserService };
