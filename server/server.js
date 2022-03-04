require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const imageRouter = require("./routes/imageRouter");

const app = express();
const PORT = 5000;

mongoose
  .connect(process.env.DATABASE_URL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    app.use("/uploads", express.static("uploads"));
    app.use("/images", imageRouter);
    app.listen(PORT, () => {
      console.log("Express server listening on PORT " + PORT);
    });
  })
  .catch((err) => console.log(err));
