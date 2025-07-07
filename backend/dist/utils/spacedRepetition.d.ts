export interface WordReview {
    wordId: string;
    rating: number;
    currentMasteryLevel: number;
    lastReviewDate: Date;
}
export interface UpdatedWordData {
    masteryLevel: number;
    currentInterval: number;
    nextReviewDate: Date;
}
export declare function updateWordAfterReview(review: WordReview): UpdatedWordData;
export declare function isWordDueForReview(word: {
    nextReviewDate: Date;
    masteryLevel: number;
}, currentDate?: Date): boolean;
export declare function createNewWordParams(): {
    masteryLevel: number;
    currentInterval: number;
    nextReviewDate: Date;
};
export declare function getProgressStats(words: Array<{
    masteryLevel: number;
    nextReviewDate: Date;
}>): {
    total: number;
    mastered: number;
    dueToday: number;
    byMasteryLevel: {
        0: number;
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
};
//# sourceMappingURL=spacedRepetition.d.ts.map