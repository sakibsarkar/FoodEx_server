const client = require("../../DB/connectDB")
const collections = require("../../DB/collections")
const { userCollection } = collections(client())

const varifyAdmin = async (req, res, next) => {
    const { email } = req?.userEmail ? req.userEmail : {}

    if (!email) {
        return res.status(401).send({ message: "unauthorized access" })
    }

    const projection = { _id: 0, role: 1 };
    const { role } = await userCollection.findOne({ user_email: email }, { projection })
        ;
    if (role !== "admin") {
        return res.status(403).send({ message: "forbidded access" })

    }

    next()

}


module.exports = varifyAdmin