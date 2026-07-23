import "dotenv/config";
import OpenAI from "openai";
import readlineSync from "readline-sync";

const client = new OpenAI();

function getWeatherDetails(city) {
  if (city.toLowerCase() === "fatehpur") return "47°C";
  if (city.toLowerCase() === "kanpur") return "49°C";
  if (city.toLowerCase() === "lucknow") return "50°C";
  if (city.toLowerCase() === "prayagraj") return "51°C";
}

const tools = {
  getWeatherDetails: getWeatherDetails,
};

const SYSTEM_PROMPT = `You are an AI Assistant with Start, Plan, Action, Observation and Output State.
Wait for the user prompt and first Plan using availble tools.
After planning, Take Action with appropriate tools and wait for Observation based on Action.
Once you get the observations, Return the AI response based on Start prompt and observations.

Strictly follow the json output format as in examples.

Available tools: 
fucntion getWeatherDetails(city: string) - returns string the weather details of the city.

Example:
Start 
{"type" : "user", "user": "What is the sum of weather of fatehpur and kanpur?"}
{"type" : "plan", "plan": "I will call getWeatherDetails for fatehpur"}
{"type" : "action", "function": "getWeatherDetails", "input": ["fatehpur"]}
{"type" : "observation", "observation": "47°C"}
{"type" : "plan", "plan": "I will call getWeatherDetails for kanpur"}
{"type" : "action", "function": "getWeatherDetails", "input": ["kanpur"]}
{"type" : "observation", "observation": "49°C"}
{"type" : "output", "output": "The sum of the weather temperatures of Fatehpur and Kanpur is 96°C."}
`;

const messages = [{ role: "system", content: SYSTEM_PROMPT }];

while (true) {
  const query = readlineSync.question(">> ");
  const q = { type: "user", user: query };
  messages.push({ role: "user", content: JSON.stringify(q) });

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      response_format: {
        type: "json_object",
      },
    });
    console.log(
      "############################# RESPONSE ########################",
    );
    console.log(JSON.stringify(response, null, 2));
    console.log(
      "############################# RESPONSE ########################",
    );
    const result = response.choices[0].message.content;
    messages.push({ role: "assistant", content: result });

    console.log("------------------------START AI ------------------------");
    console.log(result);
    console.log("------------------------End AI ------------------------");

    const jsonResult = JSON.parse(result);

    if (jsonResult.type === "output") {
      console.log(`🤖: ${jsonResult.output}`);
      break;
    } else if (jsonResult.type === "action") {
      const fn = tools[jsonResult.function];
      const obseration = fn(...jsonResult.input);
      const observationMsg = { type: "observation", observation: obseration };
      messages.push({ role: "user", content: JSON.stringify(observationMsg) });
    }
  }
}
