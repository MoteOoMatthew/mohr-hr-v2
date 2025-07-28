# Age to Date of Birth Migration

## Overview
This migration converts the employee data structure from storing `age` as a static integer to storing `date_of_birth` as a date string, with age calculated dynamically by the system.

## Changes Made

### 1. Database Schema Changes
- **File**: `backend/database/init.js`
- **Change**: Replaced `age INTEGER` with `date_of_birth TEXT` in the employees table schema

### 2. Backend API Changes

#### New Utility Functions
- **File**: `backend/utils/dateUtils.js` (new file)
- **Functions Added**:
  - `calculateAge(dateOfBirth)`: Calculates age from date of birth
  - `formatDate(dateString)`: Formats date for display
  - `validateDateOfBirth(dateOfBirth)`: Validates date of birth input

#### Employee Routes
- **File**: `backend/routes/employees.js`
- **Changes**:
  - Added date utility imports
  - Updated POST route to accept `date_of_birth` instead of `age`
  - Added date of birth validation
  - Updated GET routes to calculate age dynamically from `date_of_birth`
  - Modified database queries to use `date_of_birth` field

#### Onboarding Routes
- **File**: `backend/routes/onboarding.js`
- **Changes**:
  - Added date utility imports
  - Updated employee creation to use `date_of_birth`
  - Added date of birth validation
  - Updated GET routes to calculate age dynamically

### 3. Frontend Changes

#### New Utility Functions
- **File**: `frontend/src/utils/dateUtils.js` (new file)
- **Functions Added**:
  - `calculateAge(dateOfBirth)`: Frontend age calculation
  - `formatDate(dateString)`: Date formatting
  - `validateDateOfBirth(dateOfBirth)`: Frontend validation
  - `getAgeDisplay(dateOfBirth)`: Age display helper

#### Employees Component
- **File**: `frontend/src/pages/Employees.jsx`
- **Changes**:
  - Added date utility imports
  - Updated age display to use calculated age from `date_of_birth`
  - Maintains backward compatibility with existing `age` field

#### Onboarding Component
- **File**: `frontend/src/pages/Onboarding.jsx`
- **Changes**:
  - Replaced age input field with date of birth input
  - Updated form state to use `date_of_birth`
  - Added date validation (max date = today)
  - Updated API calls to send `date_of_birth` instead of `age`

### 4. Migration Scripts

#### Database Migration
- **File**: `backend/migrations/migrate_age_to_dob.js` (new file)
- **Purpose**: Converts existing age data to estimated date of birth
- **Process**:
  1. Adds `date_of_birth` column to employees table
  2. Estimates date of birth from existing age and hire date
  3. Removes the `age` column from the table structure

#### Migration Runner
- **File**: `scripts/migrate-age-to-dob.ps1` (new file)
- **Purpose**: PowerShell script to run the migration safely

## Migration Process

### Prerequisites
1. Backup the current database
2. Stop the application
3. Ensure no active database connections

### Running the Migration
```powershell
# Run the migration script
.\scripts\migrate-age-to-dob.ps1
```

### Post-Migration Steps
1. Test the application functionality
2. Verify age calculations are correct
3. Create a new backup
4. Deploy if testing is successful

## Benefits

### 1. Data Accuracy
- Age is always current and accurate
- No need to manually update ages annually
- Eliminates data staleness issues

### 2. Better Data Structure
- Date of birth is more fundamental than age
- Enables more precise age calculations
- Supports future features (birthday reminders, age-based policies)

### 3. Consistency
- Age is calculated consistently across the application
- Single source of truth for age calculation logic
- Reduces data inconsistencies

## Backward Compatibility

The system maintains backward compatibility by:
- Calculating age from `date_of_birth` if available
- Falling back to existing `age` field if present
- Gracefully handling missing data

## Validation Rules

### Date of Birth Validation
- Must be a valid date
- Must be in the past
- Must be after 1900-01-01
- Cannot be in the future

### Age Calculation
- Calculates age as of current date
- Accounts for month and day (not just year)
- Returns null for invalid dates

## Testing Checklist

- [ ] Employee creation with date of birth
- [ ] Employee editing with date of birth
- [ ] Age display in employee lists
- [ ] Age display in onboarding processes
- [ ] Date of birth validation
- [ ] Age calculation accuracy
- [ ] Backward compatibility with existing data
- [ ] API responses include calculated age
- [ ] Frontend forms work correctly
- [ ] Migration script runs successfully

## Rollback Plan

If issues arise, the system can be rolled back by:
1. Restoring the database backup
2. Reverting code changes
3. Running the application with the old structure

## Future Enhancements

Potential future improvements:
- Birthday notifications
- Age-based policy enforcement
- Age distribution analytics
- Age-related reporting features 