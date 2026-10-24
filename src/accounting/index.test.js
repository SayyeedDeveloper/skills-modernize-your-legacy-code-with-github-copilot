// Unit and integration tests that mirror docs/TESTPLAN.md.
const {
  createDataStore,
  createOperations,
  parseAmount,
  runApp,
} = require("./index");

// Run the menu loop with scripted answers and collect everything it prints.
async function runWithInputs(inputs, operations) {
  const answers = [...inputs];
  const output = [];
  await runApp({
    ask: async () => {
      if (answers.length === 0) throw new Error("Ran out of scripted input");
      return answers.shift();
    },
    print: (line) => output.push(line),
    ...(operations && { operations }),
  });
  return output;
}

describe("Student Account Management System", () => {
  let operations;

  beforeEach(() => {
    operations = createOperations(createDataStore());
  });

  test("TC-01: menu is displayed on start", async () => {
    const output = await runWithInputs(["4"]);
    const menu = output[0];
    expect(menu).toContain("Account Management System");
    expect(menu).toContain("1. View Balance");
    expect(menu).toContain("2. Credit Account");
    expect(menu).toContain("3. Debit Account");
    expect(menu).toContain("4. Exit");
  });

  test("TC-02: view the initial balance", () => {
    expect(operations.total()).toBe("Current balance: 1000.00");
  });

  test("TC-03: credit the account with a valid amount", () => {
    expect(operations.credit(100)).toBe("Amount credited. New balance: 1100.00");
  });

  test("TC-04: credit is persisted for later operations", () => {
    operations.credit(100);
    expect(operations.total()).toBe("Current balance: 1100.00");
  });

  test("TC-05: credit with a decimal amount", () => {
    expect(operations.credit(50.25)).toBe("Amount credited. New balance: 1050.25");
  });

  test("TC-06: credit with zero leaves the balance unchanged", () => {
    expect(operations.credit(0)).toBe("Amount credited. New balance: 1000.00");
  });

  test("TC-07: debit the account with a valid amount", () => {
    expect(operations.debit(200)).toBe("Amount debited. New balance: 800.00");
  });

  test("TC-08: debit is persisted for later operations", () => {
    operations.debit(200);
    expect(operations.total()).toBe("Current balance: 800.00");
  });

  test("TC-09: debit the exact full balance", () => {
    expect(operations.debit(1000)).toBe("Amount debited. New balance: 0.00");
  });

  test("TC-10: debit more than the balance is rejected", () => {
    expect(operations.debit(1500)).toBe("Insufficient funds for this debit.");
  });

  test("TC-11: rejected debit does not change the balance", () => {
    operations.debit(1500);
    expect(operations.total()).toBe("Current balance: 1000.00");
  });

  test("TC-12: debit from a zero balance is rejected", () => {
    operations.debit(1000);
    expect(operations.debit(0.01)).toBe("Insufficient funds for this debit.");
    expect(operations.total()).toBe("Current balance: 0.00");
  });

  test("TC-13: several operations in one session", async () => {
    const output = await runWithInputs(["2", "500.00", "3", "300.00", "1", "4"], operations);
    expect(output).toContain("Amount credited. New balance: 1500.00");
    expect(output).toContain("Amount debited. New balance: 1200.00");
    expect(output).toContain("Current balance: 1200.00");
  });

  test.each(["5", "0", "abc", ""])("TC-14: invalid menu choice %p shows an error", async (choice) => {
    const output = await runWithInputs([choice, "4"]);
    expect(output).toContain("Invalid choice, please select 1-4.");
    // The menu is shown again after the error.
    expect(output.filter((line) => line.includes("Account Management System"))).toHaveLength(2);
  });

  test("TC-15: exit the application", async () => {
    const output = await runWithInputs(["4"]);
    expect(output[output.length - 1]).toBe("Exiting the program. Goodbye!");
  });

  test("TC-16: balance resets when the application restarts", async () => {
    await runWithInputs(["2", "100", "4"]);
    const output = await runWithInputs(["1", "4"]);
    expect(output).toContain("Current balance: 1000.00");
  });

  test("TC-17: balance can reach but not exceed 999999.99", () => {
    expect(operations.credit(998999.99)).toBe("Amount credited. New balance: 999999.99");
    expect(operations.credit(0.01)).toBe("Credit rejected: balance cannot exceed 999999.99.");
    expect(operations.total()).toBe("Current balance: 999999.99");
  });

  describe("TC-18: negative and invalid amounts are not accepted", () => {
    test.each(["-100", "abc", "", "1.234", "1000000"])("parseAmount rejects %p", (input) => {
      expect(parseAmount(input)).toBeNull();
    });

    test.each([
      ["100", 100],
      ["50.25", 50.25],
      ["0", 0],
      [" 7.5 ", 7.5],
    ])("parseAmount accepts %p", (input, expected) => {
      expect(parseAmount(input)).toBe(expected);
    });

    test("a negative credit leaves the balance unchanged", async () => {
      const output = await runWithInputs(["2", "-100", "1", "4"], operations);
      expect(output).toContain(
        "Invalid amount. Please enter a positive number with up to two decimals."
      );
      expect(output).toContain("Current balance: 1000.00");
    });

    test("a negative debit leaves the balance unchanged", async () => {
      const output = await runWithInputs(["3", "-100", "1", "4"], operations);
      expect(output).toContain(
        "Invalid amount. Please enter a positive number with up to two decimals."
      );
      expect(output).toContain("Current balance: 1000.00");
    });
  });
});
