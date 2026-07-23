import { ilike, eq } from "drizzle-orm";
import db from "./db/index.js";
import { todosTable } from "./db/schema.js";
import OpenAI from "openai";
import readlineSync from "readline-sync";

const client = new OpenAI();

const getAllTodos = async () => {
  const todos = await db.select().from(todosTable);
  return todos;
};

const createTodo = async (input) => {
  const todo =
    typeof input === "string" ? input : (input?.todo ?? String(input));
  console.log("Creating todo:", todo);
  const [result] = await db
    .insert(todosTable)
    .values({ todo })
    .returning({ id: todosTable.id });
  return result.id;
};

const searchTodo = async (searchTerm) => {
  const term = typeof searchTerm === "string" ? searchTerm : String(searchTerm);
  console.log("Searching for todos with term:", term);
  const todos = await db
    .select()
    .from(todosTable)
    .where(ilike(todosTable.todo, `%${term}%`));
  return todos;
};

const deleteTodo = async (input) => {
  const todoId = parseInt(
    typeof input === "object" ? input?.todoId : input,
    10,
  );
  if (isNaN(todoId)) throw new Error(`deleteTodo: invalid id "${input}"`);
  console.log("Deleting todo with id:", todoId);
  await db.delete(todosTable).where(eq(todosTable.id, todoId));
  return "success";
};

const updateTodo = async (input) => {
  let todoId, updatedTodo;

  if (typeof input === "string" && input.includes("|")) {
    // Agent sends "3|Go to gym in the morning"
    const [idPart, ...rest] = input.split("|");
    todoId = parseInt(idPart.trim(), 10);
    updatedTodo = rest.join("|").trim();
  } else if (typeof input === "object" && input !== null) {
    // Fallback: agent sends { todoId: 3, updatedTodo: "..." }
    todoId = parseInt(input.todoId, 10);
    updatedTodo = input.updatedTodo;
  } else {
    throw new Error(`updateTodo: unrecognised input format "${input}"`);
  }

  if (isNaN(todoId) || !updatedTodo) {
    throw new Error(`updateTodo: could not parse id or text from "${input}"`);
  }

  console.log("Updating todo with id:", todoId, "to:", updatedTodo);
  await db
    .update(todosTable)
    .set({ todo: updatedTodo })
    .where(eq(todosTable.id, todoId));
  return "success";
};

const tools = {
  getAllTodos,
  createTodo,
  searchTodo,
  deleteTodo,
  updateTodo,
};

const SYSTEMPROMPT = `
You are an AI To-Do List Assistant. You operate in a strict Start → Plan → Action → Observation → Output loop.
Always respond with a single JSON object. Never combine multiple steps in one response.

Todo Table Schema:
- id: integer (primary key, auto-incremented)
- todo: text (the task description)
- created_at: timestamp
- updated_at: timestamp

Available Tools:
- getAllTodos: No input required. Returns all tasks.
- createTodo: input = plain string of the task text. Example: "Go to gym"
- searchTodo: input = plain string search term. Example: "gym"
- deleteTodo: input = numeric task id. Example: 2
- updateTodo: input = "id|new task text" (pipe-separated). Example: "3|Go to gym in the morning"

JSON output format — one of:
{"type":"plan","plan":"<what you intend to do>"}
{"type":"action","function":"<toolName>","input":<input>}
{"type":"output","output":"<final message to user>"}

Examples:

START
{"type":"user","user":"Add a task to go to gym"}
{"type":"plan","plan":"User wants to create a new todo"}
{"type":"action","function":"createTodo","input":"Go to gym"}
{"type":"observation","observation":"3"}
{"type":"output","output":"Task added successfully with id 3."}

{"type":"user","user":"What tasks do I have?"}
{"type":"plan","plan":"User wants to see all todos"}
{"type":"action","function":"getAllTodos","input":null}
{"type":"observation","observation":"[{\"id\":1,\"todo\":\"Go to gym\"},{\"id\":2,\"todo\":\"Debug code\"}]"}
{"type":"output","output":"Here are your tasks:\n1. Go to gym\n2. Debug code"}

{"type":"user","user":"Delete task 2"}
{"type":"plan","plan":"User wants to delete task with id 2"}
{"type":"action","function":"deleteTodo","input":2}
{"type":"observation","observation":"success"}
{"type":"output","output":"Task 2 deleted successfully."}

{"type":"user","user":"Update task 3 to go to gym in the morning"}
{"type":"plan","plan":"User wants to update task 3"}
{"type":"action","function":"updateTodo","input":"3|Go to gym in the morning"}
{"type":"observation","observation":"success"}
{"type":"output","output":"Task 3 updated successfully."}

{"type":"user","user":"I finished frontend debugging, only backend is left"}
{"type":"plan","plan":"Search for the relevant todo first"}
{"type":"action","function":"searchTodo","input":"debug"}
{"type":"observation","observation":"[{\"id\":3,\"todo\":\"Debug my AI agent code\"}]"}
{"type":"plan","plan":"Update the found todo with id 3"}
{"type":"action","function":"updateTodo","input":"3|Debug backend of my AI agent code"}
{"type":"observation","observation":"success"}
{"type":"output","output":"Updated your task to focus on backend debugging only."}
`;

const messages = [{ role: "system", content: SYSTEMPROMPT }];

while (true) {
  const query = readlineSync.question(">> ");
  messages.push({
    role: "user",
    content: JSON.stringify({ type: "user", user: query }),
  });

  while (true) {
    const chat = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
    });

    const result = chat.choices[0].message.content;
    messages.push({ role: "assistant", content: result });

    const action = JSON.parse(result);

    if (action.type === "output") {
      console.log("AI:", action.output);
      break;
    } else if (action.type === "action") {
      const fn = tools[action.function];
      if (!fn) throw new Error(`Unknown tool: "${action.function}"`);

      let observation;
      try {
        observation = await fn(action.input);
      } catch (err) {
        observation = `error: ${err.message}`;
      }

      messages.push({
        role: "developer",
        content: JSON.stringify({
          type: "observation",
          observation: JSON.stringify(observation),
        }),
      });
    }
  }
}
