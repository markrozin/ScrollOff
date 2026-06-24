const express = require("express");
const cors = require("cors");
const config = require("./config");
const { startCron } = require("./cron/dailyReport");

const usersRouter = require("./routes/users");
const challengesRouter = require("./routes/challenges");
const screentimeRouter = require("./routes/screentime");
const onrampRouter = require("./routes/onramp");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", usersRouter);
app.use("/challenges", challengesRouter);
app.use("/screentime", screentimeRouter);
app.use("/onramp", onrampRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startCron();
});
