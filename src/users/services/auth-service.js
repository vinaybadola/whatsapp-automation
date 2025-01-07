export default class AuthService {
    /**
    * @param {AuthRepository} authRepository
    */
    constructor(authRepository) {
        this.authRepository = authRepository;
    }
    /**
     * 
     * @param {*} user 
     * @returns 
     */
    async registerUser(user) {
        try {
            const newUser = await this.authRepository.createUser(user);
            newUser.password = undefined;
            return newUser;
        } catch (err) {
            throw new Error(`Error registering user: ${err.message}`);
        }
    }

    async loginUser(user) {
        try {
            const token = await this.authRepository.loginUser(user);
            return token;
        } catch (err) {
            throw new Error(`Error logging in user: ${err.message}`);
        }
    }

    async logoutUser(user) {
        try {
            await this.authRepository.logoutUser(user);
        } catch (err) {
            throw new Error(`Error logging out user: ${err.message}`);
        }
    }

    async resetPassword(user) {
        try {
            const message = await this.authRepository.resetPassword(user);
            return message;
        } catch (err) {
            throw new Error(`Error resetting password: ${err.message}`);
        }
    }
}