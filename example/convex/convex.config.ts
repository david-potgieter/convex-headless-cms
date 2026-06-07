import { defineApp } from "convex/server";
import headlessCms from "convex-headless-cms/convex.config";

const app = defineApp();
app.use(headlessCms);

export default app;
