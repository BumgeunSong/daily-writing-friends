export function isWorkingDay(date: Date): boolean {
    // Exclude Sundays (0) and Saturdays (6)
    if (date.getDay() === 0 || date.getDay() === 6) {
        return false;
    }

    const temporaryHolidays: Record<string, boolean> = {
        '2024-12-31': true, // 신정
        '2025-01-01': true, // 신정
        '2025-01-28': true, // 설날
        '2025-01-29': true, // 설날
        '2025-01-30': true, // 설날
    };

    const yearMonthDay = date.toISOString().split('T')[0];

    if (temporaryHolidays[yearMonthDay]) {
        return false;
    }

    return true;
}
