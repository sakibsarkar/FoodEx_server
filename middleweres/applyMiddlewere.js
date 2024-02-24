const cors = require("cors")
const express = require("express")
const cookieParser = require("cookie-parser")

const applyMiddlewere = (app) => {
    app.use(express.json())
    app.use(cors({
        origin: ["http://localhost:5173", "https://foodex-82499.web.app"],
        credentials: true
    }))

    app.use(cookieParser())
}

module.exports = applyMiddlewere