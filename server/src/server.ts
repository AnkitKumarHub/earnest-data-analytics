import { env } from "./env.js";
import { createServerApplication } from "./app/index.js";

createServerApplication().listen(env.port, () => {
  try {
    console.log(`Server is listening on port ${env.port}.`);
  } catch (error) {
    console.error("Failed to start the server.", error);
    process.exit(1);
  }
});
