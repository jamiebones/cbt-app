# Requirements Document

## Introduction

The Computer-Based Test (CBT) Application is a comprehensive testing platform built with the MERN stack that enables test center owners to create and manage tests while allowing students to take these tests in a controlled environment. The application features a hybrid architecture with local server components for secure test administration and online components for management and configuration. The system supports multimedia questions (text, audio, images) with multiple-choice answers, including questions that may have multiple correct answers.

## Requirements

### Requirement 1

**User Story:** As a test center owner, I want to register and manage my test center account, so that I can create and administer tests for my students.

#### Acceptance Criteria

1. WHEN a test center owner visits the registration page THEN the system SHALL provide fields for center name, owner details, contact information, and location
2. WHEN a test center owner submits valid registration information THEN the system SHALL create an account and send confirmation email
3. WHEN a test center owner logs in THEN the system SHALL authenticate credentials and provide access to the center dashboard
4. IF login credentials are invalid THEN the system SHALL display appropriate error messages

### Requirement 2

**User Story:** As a test center owner, I want to create users responsible for setting tests, so that I can delegate test creation responsibilities within my center.

#### Acceptance Criteria

1. WHEN creating a test creator user THEN the system SHALL provide fields for user name, role, and permissions
2. WHEN assigning test creation permissions THEN the system SHALL allow test center owners to grant or revoke access
3. WHEN a test creator logs in THEN the system SHALL provide access to test creation tools based on assigned permissions
4. IF unauthorized users attempt test creation THEN the system SHALL deny access and log the attempt

### Requirement 3

**User Story:** As a test creator, I want to create questions with rich text formatting and multimedia content, so that I can design engaging and well-formatted assessments.

#### Acceptance Criteria

1. WHEN creating questions manually THEN the system SHALL provide a rich text editor compatible with React
2. WHEN using the rich text editor THEN the system SHALL support formatting options like bold, italic, underline, lists, and text alignment
3. WHEN adding multimedia to rich text THEN the system SHALL allow embedding of images and audio within the question text
4. WHEN saving rich text content THEN the system SHALL preserve formatting and multimedia references
5. WHEN displaying questions to students THEN the system SHALL render rich text formatting correctly

### Requirement 4

**User Story:** As a test creator, I want to upload tests via Excel files, so that I can efficiently create tests with consistent formatting.

#### Acceptance Criteria

1. WHEN uploading an Excel file THEN the system SHALL validate the file format against the required template
2. WHEN processing Excel data THEN the system SHALL extract questions, answers
3. WHEN storing media files THEN the system SHALL save audio and images locally with optimized file sizes
4. IF media files exceed size limits THEN the system SHALL compress or reject files with appropriate error messages
5. WHEN Excel upload is complete THEN the system SHALL provide a summary of imported questions and any errors
6. IF Excel format is invalid THEN the system SHALL display specific error messages indicating required corrections

### Requirement 5

**User Story:** As a test center owner, I want to register students for specific tests both online and locally, so that I can manage student access flexibly.

#### Acceptance Criteria

1. WHEN registering a student online THEN the system SHALL capture student name, ID, contact information, and assigned tests
2. WHEN registering a student locally THEN the system SHALL provide the same registration interface on the local server
3. WHEN a student is registered THEN the system SHALL generate unique login credentials for the student
4. WHEN viewing registered students THEN the system SHALL display student list with test assignments and status from both online and local registrations
5. WHEN updating student information THEN the system SHALL save changes and maintain test assignment history

### Requirement 6

**User Story:** As a test center owner, I want to download registered test users to the local database, so that tests can be administered even without internet connectivity.

#### Acceptance Criteria

1. WHEN downloading registered users THEN the system SHALL retrieve all students registered for specific tests from the online database
2. WHEN synchronizing user data THEN the system SHALL update the local database with current student information and test assignments
3. WHEN download is complete THEN the system SHALL provide confirmation of the number of users synchronized
4. IF network connectivity fails during download THEN the system SHALL resume from the last successful sync point
5. WHEN local database is updated THEN the system SHALL maintain data integrity and prevent duplicate entries

### Requirement 7

**User Story:** As a student, I want to log in and take assigned tests, so that I can complete my assessments in a secure environment.

#### Acceptance Criteria

1. WHEN a student logs in with valid credentials THEN the system SHALL display available assigned tests
2. WHEN starting a test THEN the system SHALL display test instructions and begin the timer
3. WHEN answering questions THEN the system SHALL allow selection of single or multiple answers based on question type
4. WHEN the test time expires THEN the system SHALL automatically submit the test
5. IF a student attempts to navigate away during a test THEN the system SHALL display warnings and track the attempt

### Requirement 8

**User Story:** As a test center owner, I want to view test results and analytics, so that I can evaluate student performance and test effectiveness.

#### Acceptance Criteria

1. WHEN viewing test results THEN the system SHALL display student scores, completion times, and answer details
2. WHEN generating reports THEN the system SHALL provide options for individual student reports and test analytics
3. WHEN exporting results THEN the system SHALL support PDF and CSV formats
4. WHEN analyzing test performance THEN the system SHALL show question-level statistics and difficulty analysis

### Requirement 9

**User Story:** As a system administrator, I want the application to run securely with local and online components, so that test integrity is maintained while allowing flexible management.

#### Acceptance Criteria

1. WHEN the local server component runs THEN the system SHALL handle test delivery and student responses securely
2. WHEN synchronizing with online components THEN the system SHALL encrypt data transmission
3. WHEN storing test data locally THEN the system SHALL implement secure storage mechanisms
4. IF network connectivity is lost THEN the local system SHALL continue operating and sync when connection is restored
5. WHEN detecting suspicious activity THEN the system SHALL log incidents and alert administrators

### Requirement 10

**User Story:** As a test center owner, I want to configure test settings and security options, so that I can customize the testing environment for different assessment needs.

#### Acceptance Criteria

1. WHEN configuring test settings THEN the system SHALL allow customization of time limits, question randomization, and answer shuffling
2. WHEN setting security options THEN the system SHALL provide controls for browser restrictions, copy/paste prevention, and screen monitoring
3. WHEN scheduling tests THEN the system SHALL support date/time restrictions and availability windows
4. IF unauthorized access is attempted THEN the system SHALL block access and log the attempt

### Requirement 11

**User Story:** As a student, I want to experience a user-friendly test interface with multimedia support, so that I can focus on answering questions without technical difficulties.

#### Acceptance Criteria

1. WHEN viewing questions THEN the system SHALL display text clearly with appropriate formatting
2. WHEN questions include images THEN the system SHALL load and display images with zoom capabilities
3. WHEN questions include audio THEN the system SHALL provide playback controls with replay options
4. WHEN selecting answers THEN the system SHALL provide clear visual feedback for single and multiple selection modes
5. IF media fails to load THEN the system SHALL display error messages and provide alternative access methods

### Requirement 12

**User Story:** As a system administrator, I want to manage test center subscription tiers, so that I can control access to features based on payment status and generate revenue.

#### Acceptance Criteria

1. WHEN a test center registers THEN the system SHALL assign them to the "Free" tier by default
2. WHEN a free tier center creates tests THEN the system SHALL enforce the administrator-defined limit on number of tests
3. WHEN a free tier center reaches their test limit THEN the system SHALL prevent creation of additional tests and display upgrade options
4. WHEN a center upgrades to "Paid" tier THEN the system SHALL allow unlimited test creation
5. WHEN creating a test THEN the system SHALL verify the center's subscription status with the online component before allowing creation
6. WHEN the local server attempts test creation THEN the system SHALL check online subscription status and cache the result for offline validation
7. IF a center's subscription expires THEN the system SHALL downgrade them to free tier and enforce limits
8. WHEN an administrator updates tier limits THEN the system SHALL apply changes to all free tier centers

### Requirement 13

**User Story:** As a test creator, I want to manage a question bank organized by subjects, so that I can efficiently reuse questions across multiple tests and maintain a centralized repository of assessment content.

#### Acceptance Criteria

1. WHEN creating questions THEN the system SHALL allow saving questions to a centralized question bank
2. WHEN saving questions to the bank THEN the system SHALL require assignment to a subject category
3. WHEN managing subjects THEN the system SHALL allow test creators to create, edit, and delete subject categories
4. WHEN creating a new test THEN the system SHALL provide options to manually add questions or auto-select from the question bank
5. WHEN auto-selecting questions THEN the system SHALL allow filtering by subject and specifying the number of questions to randomly select
6. WHEN viewing the question bank THEN the system SHALL display questions organized by subject with search and filter capabilities
7. WHEN editing banked questions THEN the system SHALL update the question in all tests that reference it or create a new version
8. IF a banked question is deleted THEN the system SHALL warn about tests using that question and require confirmation

### Requirement 14

**User Story:** As a student, I want to access helpful tools during my test, so that I can perform calculations and solve problems more effectively.

#### Acceptance Criteria

1. WHEN taking a test THEN the system SHALL provide access to a built-in calculator tool
2. WHEN opening the calculator THEN the system SHALL display a functional calculator with basic arithmetic operations (addition, subtraction, multiplication, division)
3. WHEN using the calculator THEN the system SHALL support decimal numbers, parentheses, and memory functions
4. WHEN the calculator is open THEN the system SHALL allow students to continue answering questions without losing calculator state
5. WHEN test creators configure a test THEN the system SHALL allow enabling or disabling calculator access per test
6. IF calculator access is disabled for a test THEN the system SHALL not display the calculator tool to students
