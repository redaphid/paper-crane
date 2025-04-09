import { expect } from "chai"

mocha.setup("bdd")
mocha.checkLeaks();

describe("My Test", () => {
  it("works", () => {
    expect(true).to.be.true
  });
});

mocha.run();
