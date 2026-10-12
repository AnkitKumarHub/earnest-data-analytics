import request from "supertest";
import { describe, expect, it } from "vitest";
import { createServerApplication } from "../index.js";

const app = createServerApplication();

async function signedInAgent(email: string) {
  const agent = request.agent(app);
  await agent.post("/register").send({ name: "Task User", email, password: "password8" }).expect(201);
  return agent;
}

describe("task API", () => {
  it("creates tasks with optional descriptions and allows all three statuses", async () => {
    const agent = await signedInAgent("tasks@example.com");
    const created = await agent.post("/tasks").send({ title: "Read brief", dueDate: "2026-10-30" }).expect(201);
    expect(created.body.data.task).toMatchObject({
      title: "Read brief",
      description: null,
      status: "pending",
      dueDate: "2026-10-30",
    });

    const inProgress = await agent.patch(`/tasks/${created.body.data.task.id}`).send({ status: "in_progress" }).expect(200);
    expect(inProgress.body.data.task.status).toBe("in_progress");
    const completed = await agent.patch(`/tasks/${created.body.data.task.id}`).send({ status: "completed" }).expect(200);
    expect(completed.body.data.task.status).toBe("completed");
    const reopened = await agent.patch(`/tasks/${created.body.data.task.id}`).send({ status: "pending" }).expect(200);
    expect(reopened.body.data.task.status).toBe("pending");
  });

  it("validates due dates and update bodies", async () => {
    const agent = await signedInAgent("validation@example.com");
    const missingDueDate = await agent.post("/tasks").send({ title: "Missing date" }).expect(400);
    expect(missingDueDate.body.error.fields.dueDate).toBeDefined();

    const invalidDate = await agent.post("/tasks").send({ title: "Bad date", dueDate: "2026-02-30" }).expect(400);
    expect(invalidDate.body.error.code).toBe("VALIDATION_ERROR");
    const created = await agent.post("/tasks").send({ title: "Valid", dueDate: "2026-10-30" }).expect(201);
    const emptyUpdate = await agent.patch(`/tasks/${created.body.data.task.id}`).send({}).expect(400);
    expect(emptyUpdate.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("filters and paginates only the signed-in user's tasks", async () => {
    const owner = await signedInAgent("owner@example.com");
    const other = await signedInAgent("other@example.com");

    const first = await owner.post("/tasks").send({ title: "Assignment report", dueDate: "2026-10-20" }).expect(201);
    const second = await owner.post("/tasks").send({ title: "Assignment review", dueDate: "2026-10-22" }).expect(201);
    await owner.patch(`/tasks/${first.body.data.task.id}`).send({ status: "in_progress" }).expect(200);
    await other.post("/tasks").send({ title: "Assignment secret", dueDate: "2026-10-21" }).expect(201);

    const page = await owner.get("/tasks?page=1&pageSize=1&status=in_progress&dueFrom=2026-10-19&dueTo=2026-10-25&search=report").expect(200);
    expect(page.body.data.items).toHaveLength(1);
    expect(page.body.data.items[0].id).toBe(first.body.data.task.id);
    expect(page.body.data.pagination).toMatchObject({ page: 1, pageSize: 1, totalItems: 1, totalPages: 1 });

    const nextPage = await owner.get("/tasks?page=2&pageSize=1").expect(200);
    expect(nextPage.body.data.items).toHaveLength(1);
    expect(nextPage.body.data.items[0].id).toBe(second.body.data.task.id);
  });

  it("hides another user's task from reads, updates, and deletes", async () => {
    const owner = await signedInAgent("private-owner@example.com");
    const stranger = await signedInAgent("stranger@example.com");
    const created = await owner.post("/tasks").send({ title: "Private", dueDate: "2026-10-30" }).expect(201);
    const id = created.body.data.task.id;

    await stranger.get(`/tasks/${id}`).expect(404);
    await stranger.patch(`/tasks/${id}`).send({ status: "completed" }).expect(404);
    await stranger.delete(`/tasks/${id}`).expect(404);
    await owner.delete(`/tasks/${id}`).expect(204);
  });
});
