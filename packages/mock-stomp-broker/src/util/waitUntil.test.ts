import waitUntil from "./waitUntil";

describe("waitUntil", () => {
  it("resolves when the predicate returns true before the timeout", async () => {
    const predicate = () => x !== "foo";
    let x = "foo";
    let y = 1;

    setTimeout(() => (x = "bar"), 1000);
    setTimeout(() => (y = 2), 500);

    await waitUntil(predicate);

    expect(y).toBe(2);
  });

  describe("timing out", () => {
    it("fails with default message when no custom message is passed", async () => {
      let x = "foo";
      setTimeout(() => (x = "bar"), 1000);
      const predicate = () => x === "baz";

      try {
        await waitUntil(predicate);
      } catch (e) {
        expect(e).toBe("Predicate did not become true in 2000ms");
      }
    });

    it("fails with custom error message when provided", async () => {
      let x = "foo";
      setTimeout(() => (x = "bar"), 1000);
      const predicate = () => x === "baz";

      try {
        await waitUntil(predicate, "I am a custom error message");
      } catch (e) {
        expect(e).toBe("I am a custom error message");
      }
    });
  });
});
