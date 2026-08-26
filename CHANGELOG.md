# Changelog

All notable changes to the HRMS project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] - 2026-08-26 - Manager Assignment & Approval Refinements

**Author**: Randy Lin

### Added

- `Employee.manager` field: a designated manager (empID) per employee, editable in the employee edit dialog and shown as a 主管 column in 員工管理.
- `GET /api/constants` endpoint exposing `backend/src/constants.ts`'s working-time schedule to the frontend.
- 補單原因 radio-button reasons (with an "其他" free-text option) and a policy reminder note in the post-clock request form.
- `FilePreviewDialog` gained an optional `memo` note and `onUpload` control, used on 請假審核's 佐證資料 dialog to backfill missing files during the system-migration window; 主管審核's grid now shows an 附件 column too.

### Changed

- Manager-approve/reject and pending-manager queries (leave, business-trip, post-clock, official-business) now authorize via the requester matching the request-owner's `Employee.manager`, replacing the old department+role('manager') match; 主管審核 is now visible to every employee rather than gated by role.
- Cross-day business-trip attendance now bounds each day's clock-in/out to that day's own segment instead of the trip's overall start/end.

## [1.1.0] - 2026-08-21 - Substitute & Manager Approval Stages

**Author**: Randy Lin

### Added

- Substitute (代理) and manager (主管) approval stages ahead of the existing HR/Admin decision, for leave, business-trip, post-clock, and official-business requests.
- `代理審核` / `主管審核` tabs in 審核中心, visible to all employees; the 4 existing tabs stay HR/Admin-only.
- Required 代理人 (substitute) picker on the leave request form, filtered to the requester's department.
- New `substitute-approve/reject`, `manager-approve/reject`, and `pending/*` endpoints per module, plus aggregated `GET /api/approvals/pending-manager`.

### Changed

- HR/Admin approve/reject now shows a confirmation prompt when the substitute/manager stage hasn't cleared, but still proceeds unchanged once confirmed.
- Employee edit dialog: 主管 (manager) role is selectable again.

## [1.0.1] - 2026-08-03 - Rebuild Employee Attendance Records

**Author**: Randy Lin

### Added

- 「重建出勤紀錄」 button in the employee edit dialog: rebuilds attendance from hire date (bounded by `SYSTEM_START_DATE`) to today — creates missing working-day records (skipping weekends/national holidays) and re-imports the employee's swipe records from the saveData files.
- `POST /api/attendance/employee/:empID/recreate` endpoint (admin/HR only) backed by `attendanceService.recreateEmployeeAttendance()`.
- `SYSTEM_START_DATE` environment variable (`config.systemStartTime`), wired into `.env.example` and `docker-compose.yml`.

### Changed

- Extracted shared swipe-record apply logic (`applyParsedRecord()`) out of `importSaveDataFile()` in `attendanceService`, reused by the rebuild flow.
- Renamed `constants.ts` export `CONFIG` to `CONST`.

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
