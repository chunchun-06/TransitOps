const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error.middleware");

const routes = require("./routes");

const app = express();

app.use(helmet());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(morgan("dev"));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "TransitOps API Running"
    });
});

app.use("/api", routes);
app.use(errorHandler);
module.exports = app;