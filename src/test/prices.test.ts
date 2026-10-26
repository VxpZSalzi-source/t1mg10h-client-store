import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/telegram.functions";

describe("Preise", () => {
  it("Monatlich kostet 9.99€", () => expect(PLANS.monthly.price).toBe("9.99€"));
  it("Lifetime kostet 26.99€", () => expect(PLANS.lifetime.price).toBe("26.99€"));
});
