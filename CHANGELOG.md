# Changelog

All notable changes to the HRMS project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-07-31 - HRMS INIT with basic functionality

**Author**: Randy Lin

### Added

- `backend/src/constants.ts`: centralized `CONFIG` for working-time schedule (work/lunch hours, standard half-day minutes).
- `backend/src/types.ts`: shared working-time calc types (`WorkingTimeMode`, `CalcOptions`, `WorkingDurationResult`, `DailyResult`, `WorkingSchedule`).
- `holidayService.getHolidaysStringByDateRange()`: returns holiday date strings (`YYYY-MM-DD`) within a range.
- `calcWorkingDurationHelper()`: loads holidays for the range and calculates duration in `Standardized` mode.
- `CheckLeaveBalance` response now includes `remainingHours` and `requestedHours` (`CheckLeaveBalanceRes`).

### Changed

- Rewrote `workingTimeCalcService` around `WorkingTimeMode.Physical` / `Standardized` modes; result renamed to `workingMinutes` / `breakMinutes` / `outsideWorkingMinutes` / `holidayMinutes`.
- Leave, return-Taiwan leave, and balance calculations now exclude national holidays (previously weekends only) via the new helper.
- `util` submodule (backend & frontend): added `isWorkingDay()` and `getOverlapMinutes()` shared utilities.
- Moved frontend types from `src/types/index.ts` to `src/types.ts`.

### Removed

- Frontend local `workingTimeCalcService.ts` and the commented-out client-side leave balance check in `LeaveRequestModal` (balance is now validated by the backend API only).
- Unused `calcWorkDuration()` in `attendanceService` and obsolete `workingTimeCalcService.test.ts.old`.
