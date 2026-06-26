export declare class SupportService {
    createTicket(data: {
        residentId: string;
        subject: string;
        description: string;
        category: string;
        attachmentFiles?: string[];
    }): Promise<{
        resident: {
            fullName: string;
            email: string;
            accountNumber: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        residentId: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        ticketId: string;
        assignedTo: string | null;
        subject: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        attachments: string[];
    }>;
    getResidentTickets(residentId: string, query: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        tickets: ({
            replies: {
                message: string;
                id: string;
                createdAt: Date;
                userId: string;
                ticketId: string;
                attachments: string[];
                isAdmin: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            residentId: string;
            status: import("@prisma/client").$Enums.TicketStatus;
            ticketId: string;
            assignedTo: string | null;
            subject: string;
            description: string;
            category: import("@prisma/client").$Enums.TicketCategory;
            attachments: string[];
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getAllTickets(query: {
        page?: number;
        limit?: number;
        status?: string;
        category?: string;
        search?: string;
    }): Promise<{
        tickets: ({
            resident: {
                fullName: string;
                email: string;
                accountNumber: string;
            };
            assignee: {
                fullName: string;
            };
            replies: {
                message: string;
                id: string;
                createdAt: Date;
                userId: string;
                ticketId: string;
                attachments: string[];
                isAdmin: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            residentId: string;
            status: import("@prisma/client").$Enums.TicketStatus;
            ticketId: string;
            assignedTo: string | null;
            subject: string;
            description: string;
            category: import("@prisma/client").$Enums.TicketCategory;
            attachments: string[];
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getTicketById(id: string): Promise<{
        resident: {
            fullName: string;
            email: string;
            accountNumber: string;
        };
        assignee: {
            fullName: string;
        };
        replies: ({
            user: {
                fullName: string;
                role: import("@prisma/client").$Enums.Role;
                profilePicture: string;
            };
        } & {
            message: string;
            id: string;
            createdAt: Date;
            userId: string;
            ticketId: string;
            attachments: string[];
            isAdmin: boolean;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        residentId: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        ticketId: string;
        assignedTo: string | null;
        subject: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        attachments: string[];
    }>;
    replyToTicket(data: {
        ticketId: string;
        userId: string;
        message: string;
        isAdmin: boolean;
        attachmentFiles?: string[];
    }): Promise<{
        user: {
            fullName: string;
            role: import("@prisma/client").$Enums.Role;
            profilePicture: string;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        ticketId: string;
        attachments: string[];
        isAdmin: boolean;
    }>;
    updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        residentId: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        ticketId: string;
        assignedTo: string | null;
        subject: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        attachments: string[];
    }>;
    getTicketStats(): Promise<{
        open: number;
        pending: number;
        resolved: number;
        closed: number;
        total: number;
    }>;
}
export declare const supportService: SupportService;
//# sourceMappingURL=support.service.d.ts.map