"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWordAfterReview = updateWordAfterReview;
exports.isWordDueForReview = isWordDueForReview;
exports.createNewWordParams = createNewWordParams;
exports.getProgressStats = getProgressStats;
const MASTERY_INTERVALS = {
    0: 1,
    1: 6,
    2: 12,
    3: 24,
    4: 48,
    5: -1
};
function updateWordAfterReview(review) {
    const { rating, currentMasteryLevel } = review;
    let newMasteryLevel = currentMasteryLevel;
    switch (rating) {
        case 1:
            newMasteryLevel = 0;
            break;
        case 2:
            break;
        case 3:
            newMasteryLevel = Math.min(currentMasteryLevel + 1, 4);
            break;
        case 4:
            newMasteryLevel = Math.min(currentMasteryLevel + 2, 5);
            break;
        default:
            throw new Error(`Invalid rating: ${rating}. Must be 1-4.`);
    }
    const newInterval = MASTERY_INTERVALS[newMasteryLevel];
    const nextReviewDate = new Date();
    if (newInterval > 0) {
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    }
    return {
        masteryLevel: newMasteryLevel,
        currentInterval: newInterval,
        nextReviewDate
    };
}
function isWordDueForReview(word, currentDate = new Date()) {
    if (word.masteryLevel >= 5) {
        return false;
    }
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const reviewDate = new Date(word.nextReviewDate.getFullYear(), word.nextReviewDate.getMonth(), word.nextReviewDate.getDate());
    return today >= reviewDate;
}
function createNewWordParams() {
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + 1);
    return {
        masteryLevel: 0,
        currentInterval: 1,
        nextReviewDate
    };
}
function getProgressStats(words) {
    const today = new Date();
    const stats = {
        total: words.length,
        mastered: 0,
        dueToday: 0,
        byMasteryLevel: {
            0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        }
    };
    words.forEach(word => {
        stats.byMasteryLevel[word.masteryLevel]++;
        if (word.masteryLevel >= 5) {
            stats.mastered++;
        }
        else if (isWordDueForReview(word, today)) {
            stats.dueToday++;
        }
    });
    return stats;
}
//# sourceMappingURL=spacedRepetition.js.map