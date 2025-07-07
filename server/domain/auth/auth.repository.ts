class AuthRepository {
    private static instance: AuthRepository;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): AuthRepository {
        if (!AuthRepository.instance) {
        AuthRepository.instance = new AuthRepository();
        }
        return AuthRepository.instance;
    }

    public async login(email: string, password: string): Promise<string> {
        // Simulate a login operation
        return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`Token for ${email}`);
        }, 1000);
        });
    }

    public async register(email: string, password: string): Promise<string> {
        // Simulate a registration operation
        return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`User ${email} registered successfully`);
        }, 1000);
        });
    }
}