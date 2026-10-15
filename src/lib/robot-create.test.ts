import { describe, expect, it, vi } from "vitest";
import { createRobot, ExistingRobotError, robotSaveErrorMessage } from "./robot-create";

const draft = { workspaceId: "workspace", vendorId: "owner", name: "Vision 60", productUrl: "", description: "", organizationIds: ["owner", "academy", "academy", "another-vendor"] };

function database(results: Record<string, unknown[]>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit", "maybeSingle", "single", "insert", "upsert"]) {
      query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query; };
    }
    query.then = (resolve: (value: unknown) => void) => Promise.resolve(results[table]?.shift() ?? { error: null }).then(resolve);
    return query;
  });
  return { db: { from } as never, calls };
}

describe("createRobot", () => {
  it("tolerates existing associations and creates opportunities only for the owning vendor", async () => {
    const { db, calls } = database({ robots: [{ data: null }, { data: { id: "robot" } }], meetups: [{ data: [{ id: "meetup" }] }], pipeline_stages: [{ data: { id: "stage" } }] });
    const saved = vi.fn();
    expect(await createRobot(db, draft, saved)).toBe("robot");
    expect(saved).toHaveBeenCalledWith("robot");
    expect(calls.find(call => call.table === "robot_company_links" && call.method === "upsert")?.args).toEqual([
      [{ workspace_id: "workspace", robot_id: "robot", vendor_id: "academy" }, { workspace_id: "workspace", robot_id: "robot", vendor_id: "another-vendor" }],
      { onConflict: "robot_id,vendor_id", ignoreDuplicates: true },
    ]);
    expect(calls.find(call => call.table === "opportunities" && call.method === "upsert")?.args[0]).toEqual([{ workspace_id: "workspace", vendor_id: "owner", robot_id: "robot", meetup_id: "meetup", stage_id: "stage" }]);
  });

  it("exposes database error messages and retains the saved id after a later failure", async () => {
    const { db } = database({ robots: [{ data: null }, { data: { id: "robot" } }], robot_company_links: [{ error: { message: "Permission denied", code: "42501" } }] });
    const saved = vi.fn();
    await expect(createRobot(db, draft, saved)).rejects.toThrow("The robot is saved, but setup is incomplete. Choose Finish setup to retry. Could not save the organization associations: Permission denied");
    expect(saved).toHaveBeenCalledWith("robot");
  });

  it("resumes setup without inserting or updating the robot again", async () => {
    const { db, calls } = database({ meetups: [{ data: [] }], pipeline_stages: [{ data: null }] });
    expect(await createRobot(db, { ...draft, savedRobotId: "robot" }, vi.fn())).toBe("robot");
    expect(calls.some(call => call.table === "robots")).toBe(false);
  });

  it("identifies an existing robot without writing anything", async () => {
    const { db, calls } = database({ robots: [{ data: { id: "existing" } }] });
    const error = await createRobot(db, draft, vi.fn()).catch(cause => cause);
    expect(error).toBeInstanceOf(ExistingRobotError);
    expect(error.robotId).toBe("existing");
    expect(calls.some(call => ["insert", "upsert"].includes(call.method))).toBe(false);
  });

  it("shows a plain database failure before a robot is saved", async () => {
    const { db } = database({ robots: [{ error: { message: "JWT expired" } }] });
    await expect(createRobot(db, draft, vi.fn())).rejects.toThrow("Could not save the robot: JWT expired");
    expect(robotSaveErrorMessage(null)).toContain("Check your connection");
  });
});
