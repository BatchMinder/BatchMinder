# BatchMinder System Requirements & Approval Workflow Specification

This document details the functional requirements and architectural specifications for the **BatchMinder** approval workflow system (Requirements FE-19 through FE-24).

---

## 📋 Module Overview: Approval Workflow & Role Architecture

BatchMinder manages student course requests (Add, Drop, Course Withdrawal, and Special Permission) through a strict multi-level approval pipeline involving **only the Batch Advisor and the Head of Department (HOD)**. The system enforces strict role-based access control, validation against academic rules (prerequisites, credit hour limits, duplicate active enrollments), and full audit logging.

---

## 🛠️ Functional Requirements Specification (FE-19 – FE-24)

### **FE-19: Course Approval Request Submission & Validation**
* **Request Types**: Students or Batch Advisors can initiate requests for:
  * `add`: Adding a new course.
  * `drop`: Dropping an enrolled course.
  * `withdrawal`: Official course withdrawal.
  * `special_permission`: Overriding prerequisites, credit-hour limits, or backlogs with justification.
* **Validation Engine**: Pre-submission checks validate:
  * **Duplicate Detection**: Prevents duplicate active enrollments or duplicate active pending requests.
  * **Semester Sequence Check**: Restricts requesting courses belonging to future semesters relative to student's current standing.
  * **Prerequisite Verification**: Evaluates prerequisite completion status (`prereqCheck`).
  * **Credit Hour & Backlog Tracking**: Computes credit-hour load and flags backlog status (`isBacklog`, `duplicateWarning`).

---

### **FE-20: Advisor → HOD Approval Chain (Strict Two-Level Workflow)**
* **Approval Chain Scope**: Strictly **Advisor to HOD only**. No other roles (including Dean or Academic Admin) participate in or execute Level-1 or Level-2 approval request decisions.
* **Level-1 Approval (Batch Advisor)**:
  * Initial review conducted by the assigned Batch Advisor.
  * Advisor decision sets status to `advisor_approved` or `advisor_rejected`.
* **Level-2 Approval (Head of Department - HOD Only)**:
  * Requests approved at Level-1 escalate to Level-2 for final HOD review.
  * Enforced in `backend/routes/hodRoutes.js` (`restrictTo('admin')`) and `backend/middleware/roleMiddleware.js` strictly limiting access to the HOD (`admin`) role.
  * **Strict Role Boundary**: Level-2 actions are strictly reserved for the Head of Department (HOD). No Dean or other administrative roles can override or process Level-2 HOD queue items.

---

### **FE-21: Special Permission Requests & Overrides**
* **Justification Enforcement**: Special permission requests require an explicit justification string (`justification`, `overrideJustification`).
* **Validation Bypassing**: When flagged for special permission, only the HOD can grant special permission (`special_granted`) to override prerequisite or credit-hour constraints.

---

### **FE-22: HOD Decision & Action Handling**
* **HOD Actions**: At Level-2, the HOD can execute four primary actions:
  1. **Approve (`approved`)**: Final approval of course change; updates student record status.
  2. **Reject (`rejected`)**: Rejection at Level-2 with feedback remarks.
  3. **Special Grant (`special_granted`)**: Overrides prerequisite/credit limits with documented justification.
  4. **Return for Edit (`returned_for_edit`)**: Sends request back to student/advisor for amendment.
* **Remarks Tracking**: All decisions store approver ID (`decidedBy`), timestamp (`decidedAt`), and remarks (`advisorRemarks`, `hodRemarks`).

---

### **FE-23: Request Status Lifecycle & Schema Enum (`approvalRequest.js`)**
The `ApprovalRequest` Mongoose schema defines the complete state machine lifecycle:
* **Status Enum**:
  * `pending` — Submitted, awaiting Level-1 Advisor review.
  * `advisor_approved` — Passed Level-1, awaiting Level-2 HOD action.
  * `advisor_rejected` — Rejected by Advisor at Level-1.
  * `approved` — Final approval granted by HOD.
  * `rejected` — Final rejection by HOD.
  * `special_granted` — Special permission granted by HOD.
  * `returned_for_edit` — Returned by HOD for modification.
* **Current Approver Role Enum (`currentApproverRole`)**:
  * `advisor` | `hod` | `none` | `student`

---

### **FE-24: Audit Trail & Historical Decision Logs**
* **Database Audit Integration**: Every state transition (creation, Level-1 Advisor decision, Level-2 HOD decision) triggers an audit log entry (`AuditLog` collection).
* **Request History Views**: HOD and Advisor dashboards maintain dedicated historical endpoints (`/api/hod/history`, `/api/advisor/history`) to inspect past decisions, timestamps, and justification notes.

---

## 📌 Summary Matrix

| Requirement | Description | Approver Level | Permitted Roles | Key Schema Fields / Status |
| :--- | :--- | :--- | :--- | :--- |
| **FE-19** | Submission & Rules Check | Pre-Submission | Student / Advisor | `prereqCheck`, `duplicateWarning`, `isBacklog` |
| **FE-20** | Approval Chain | Level-1 & Level-2 | **Advisor (L1) → HOD Only (L2)** | `status`: `pending` → `advisor_approved` → `approved` |
| **FE-21** | Special Permission | Level-2 | **HOD Only** | `justification`, `overrideJustification` |
| **FE-22** | HOD Decision Actions | Level-2 | **HOD Only** | `approved`, `rejected`, `special_granted`, `returned_for_edit` |
| **FE-23** | State Machine Enum | All Levels | System-Enforced | `status`, `currentApproverRole` |
| **FE-24** | Audit & Decision Log | System-wide | Advisor / HOD | `advisorDecision`, `hodDecision`, `AuditLog` |
