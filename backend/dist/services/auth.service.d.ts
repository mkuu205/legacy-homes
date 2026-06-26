export declare class AuthService {
    register(data: {
        fullName: string;
        email: string;
        phone: string;
        houseNumber: string;
        password: string;
        nationalId?: string;
        profilePicture?: string;
    }): Promise<{
        userId: string;
        email: string;
        message: string;
    }>;
    sendOTP(userId: string, email: string, name: string): Promise<void>;
    verifyOTPAndActivate(userId: string, otp: string): Promise<{
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            houseId: string | null;
            fullName: string;
            email: string;
            phone: string;
            passwordHash: string;
            role: import(".prisma/client").$Enums.Role;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
            profilePicture: string | null;
            nationalId: string | null;
            accountNumber: string;
            emailVerified: boolean;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    login(email: string, password: string): Promise<{
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            houseId: string | null;
            fullName: string;
            email: string;
            phone: string;
            passwordHash: string;
            role: import(".prisma/client").$Enums.Role;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
            profilePicture: string | null;
            nationalId: string | null;
            accountNumber: string;
            emailVerified: boolean;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<void>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    private generateTokens;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map