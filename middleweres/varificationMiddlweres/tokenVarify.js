const jwt = require("jsonwebtoken")
require('dotenv').config()

const varifyToken = (req, res, next) => {
    const token = req.cookies.token
    if (!token) {
        return res.status(401).send({ message: "forbiden access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decode) => {
        if (err) {
            return res.status(403).send({ message: "unauthorized access" })

        }
        req.userEmail = decode
        next()
    })
}


module.exports = varifyToken