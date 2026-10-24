# Test Plan: Student Account Management System

This test plan covers the business logic of the legacy COBOL application (`src/cobol/main.cob`, `operations.cob`, `data.cob`). Business stakeholders can use it to validate the current behavior, and it is the blueprint for the unit and integration tests of the Node.js version.

**Common pre-condition:** unless stated otherwise, the application has just been started, so the balance is the initial **1000.00**.

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Menu is displayed on start | Application started | 1. Start the application | Menu shows "Account Management System" with options 1. View Balance, 2. Credit Account, 3. Debit Account, 4. Exit, then "Enter your choice (1-4): " | | | Entry point in `main.cob` |
| TC-02 | View the initial balance | Application started | 1. Select option 1 | "Current balance: 1000.00" is displayed | | | Initial value of `STORAGE-BALANCE` |
| TC-03 | Credit the account with a valid amount | Balance is 1000.00 | 1. Select option 2<br>2. Enter 100.00 | "Amount credited. New balance: 1100.00" | | | `ADD AMOUNT TO FINAL-BALANCE` |
| TC-04 | Credit is persisted for later operations | TC-03 completed (balance 1100.00) | 1. Select option 1 | "Current balance: 1100.00" | | | New balance is written via `DataProgram WRITE` |
| TC-05 | Credit with a decimal amount | Balance is 1000.00 | 1. Select option 2<br>2. Enter 50.25 | "Amount credited. New balance: 1050.25" | | | Two decimal places are kept |
| TC-06 | Credit with zero | Balance is 1000.00 | 1. Select option 2<br>2. Enter 0 | "Amount credited. New balance: 1000.00" | | | Zero is allowed and leaves the balance unchanged |
| TC-07 | Debit the account with a valid amount | Balance is 1000.00 | 1. Select option 3<br>2. Enter 200.00 | "Amount debited. New balance: 800.00" | | | `SUBTRACT AMOUNT FROM FINAL-BALANCE` |
| TC-08 | Debit is persisted for later operations | TC-07 completed (balance 800.00) | 1. Select option 1 | "Current balance: 800.00" | | | |
| TC-09 | Debit the exact full balance | Balance is 1000.00 | 1. Select option 3<br>2. Enter 1000.00 | "Amount debited. New balance: 0.00" | | | Rule: balance >= amount, so equality is allowed |
| TC-10 | Debit more than the balance | Balance is 1000.00 | 1. Select option 3<br>2. Enter 1500.00 | "Insufficient funds for this debit." is displayed | | | Overdrafts are rejected |
| TC-11 | Rejected debit does not change the balance | TC-10 completed | 1. Select option 1 | "Current balance: 1000.00" | | | No `WRITE` happens on insufficient funds |
| TC-12 | Debit a small amount from a zero balance | Balance is 0.00 (after TC-09) | 1. Select option 3<br>2. Enter 0.01 | "Insufficient funds for this debit." | | | Boundary case |
| TC-13 | Several operations in one session | Balance is 1000.00 | 1. Credit 500.00<br>2. Debit 300.00<br>3. View balance | Balances shown: 1500.00, then 1200.00, then "Current balance: 1200.00" | | | Balance persists across operations in one run |
| TC-14 | Invalid menu choice | Application started | 1. Enter 5 (or 0, or any other value) | "Invalid choice, please select 1-4." and the menu is shown again | | | `WHEN OTHER` branch in `main.cob` |
| TC-15 | Exit the application | Application started | 1. Select option 4 | "Exiting the program. Goodbye!" and the program ends | | | Sets `CONTINUE-FLAG` to 'NO' |
| TC-16 | Balance resets on restart | Balance was changed, then the app was exited | 1. Start the application again<br>2. Select option 1 | "Current balance: 1000.00" | | | Data is kept in memory only, not saved to disk |
| TC-17 | Maximum balance limit | Balance is 1000.00 | 1. Credit 998999.99<br>2. View balance | "Current balance: 999999.99" | | | `PIC 9(6)V99` allows at most 999,999.99 |
| TC-18 | Negative amounts are not accepted | Balance is 1000.00 | 1. Select option 2 or 3<br>2. Enter -100 | The amount is not treated as negative; the balance never goes below 0 | | | `PIC 9(6)V99` is unsigned. The Node.js version should reject negative or non-numeric amounts with an error message |
