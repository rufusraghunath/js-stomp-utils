import waitUntil from "./waitUntil";

describe("waitUntil", () => {
  it("returns an awaitable promise of a future state", async () => {
    const predicate = () => x !== "foo";
    let x = "foo";
    let y = 1;

    setTimeout(() => (x = "bar"), 1000);
    setTimeout(() => (y = 2), 500);

    await waitUntil(predicate);

    expect(y).toBe(2);
  });

  it("fails with default message when no custom message is passed", () => {
    // TODO
  });

  it("fails with custom error message when provided", () => {
    // TODO
  });
});
