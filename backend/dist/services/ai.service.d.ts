export declare class AIService {
    chat(userId: string, message: string): Promise<{
        message: string;
    } | {
        message: string;
        usage: {
            prompt_tokens: number;
            completion_tokens: number;
        };
    }>;
    private getFallbackResponse;
}
export declare const aiService: AIService;
//# sourceMappingURL=ai.service.d.ts.map