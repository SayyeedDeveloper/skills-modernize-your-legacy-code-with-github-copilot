#!/usr/bin/env node
/**
 * Student Account Management System (Node.js)
 *
 * A port of the legacy COBOL application in src/cobol:
 *   - data.cob       -> createDataStore()  (READ / WRITE of the stored balance)
 *   - operations.cob -> createOperations() (TOTAL, CREDIT, DEBIT)
 *   - main.cob       -> runApp()           (menu loop)
 *
 * Business rules preserved from the COBOL version:
 *   - The balance starts at 1000.00 and is kept in memory only.
 *   - Amounts and balances are unsigned with two decimals (PIC 9(6)V99),
 *     so the maximum value is 999999.99.
 *   - Credits always succeed (within the maximum balance).
 *   - Debits only succeed when balance >= amount, otherwise the balance is unchanged.
 */
const readline = require("node:readline");

const INITIAL_BALANCE = 1000.0;
const MAX_BALANCE = 999999.99;

// Work in integer cents to avoid floating point rounding errors.
const toCents = (amount) => Math.round(amount * 100);
const fromCents = (cents) => cents / 100;
const formatAmount = (amount) => amount.toFixed(2);

// data.cob: DataProgram keeps the balance and supports READ and WRITE.
function createDataStore(initialBalance = INITIAL_BALANCE) {
  let storageBalance = initialBalance;
  return {
    read: () => storageBalance,
    write: (balance) => {
      storageBalance = balance;
    },
  };
}

// Validate user input the way PIC 9(6)V99 constrains it: a non-negative number
// with at most two decimal places and no larger than 999999.99.
function parseAmount(input) {
  const text = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const amount = Number(text);
  return amount <= MAX_BALANCE ? amount : null;
}

// operations.cob: the business logic for each menu option.
function createOperations(dataStore) {
  return {
    // TOTAL: show the current balance.
    total() {
      return `Current balance: ${formatAmount(dataStore.read())}`;
    },

    // CREDIT: add the amount to the balance and save it.
    credit(amount) {
      const newCents = toCents(dataStore.read()) + toCents(amount);
      if (fromCents(newCents) > MAX_BALANCE) {
        return `Credit rejected: balance cannot exceed ${formatAmount(MAX_BALANCE)}.`;
      }
      dataStore.write(fromCents(newCents));
      return `Amount credited. New balance: ${formatAmount(dataStore.read())}`;
    },

    // DEBIT: subtract the amount only if there are sufficient funds.
    debit(amount) {
      const balanceCents = toCents(dataStore.read());
      if (balanceCents >= toCents(amount)) {
        dataStore.write(fromCents(balanceCents - toCents(amount)));
        return `Amount debited. New balance: ${formatAmount(dataStore.read())}`;
      }
      return "Insufficient funds for this debit.";
    },
  };
}

const MENU = [
  "--------------------------------",
  "Account Management System",
  "1. View Balance",
  "2. Credit Account",
  "3. Debit Account",
  "4. Exit",
  "--------------------------------",
].join("\n");

// main.cob: show the menu until the user chooses Exit.
// `ask` is an async function that prints a prompt and resolves with the user's answer,
// `print` writes a line of output. Both are injectable for testing.
async function runApp({ ask, print, operations = createOperations(createDataStore()) }) {
  let continueFlag = true;
  while (continueFlag) {
    print(MENU);
    const choice = (await ask("Enter your choice (1-4): ")).trim();

    switch (choice) {
      case "1":
        print(operations.total());
        break;
      case "2":
      case "3": {
        const label = choice === "2" ? "credit" : "debit";
        const amount = parseAmount(await ask(`Enter ${label} amount: `));
        if (amount === null) {
          print("Invalid amount. Please enter a positive number with up to two decimals.");
        } else {
          print(operations[label](amount));
        }
        break;
      }
      case "4":
        continueFlag = false;
        break;
      default:
        print("Invalid choice, please select 1-4.");
    }
  }
  print("Exiting the program. Goodbye!");
}

if (require.main === module) {
  const rl = readline.createInterface({ input: process.stdin });
  const lines = rl[Symbol.asyncIterator]();
  // Read one line per prompt; treat end of input (Ctrl+D or end of a pipe) as Exit.
  const ask = async (prompt) => {
    process.stdout.write(prompt);
    const { value, done } = await lines.next();
    return done ? "4" : value;
  };
  runApp({ ask, print: console.log }).then(() => rl.close());
}

module.exports = {
  INITIAL_BALANCE,
  MAX_BALANCE,
  createDataStore,
  createOperations,
  parseAmount,
  formatAmount,
  runApp,
};
