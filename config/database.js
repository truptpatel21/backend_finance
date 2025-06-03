// const fs = require('fs');
const mysql = require('mysql2');
// const env = require('dotenv').config();


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to the database:", err);
        return;
    }
    console.log("Connected to the database");
    connection.release();
});

module.exports = pool;



// const mysql = require('mysql2');

// const pool = mysql.createPool({
//     host: "127.0.0.1",
//     user: "root",
//     password: "trupt",
//     database: "finance"
// });

// pool.getConnection((err, connection) => {
//     if (err) {
//         console.error("Error connecting to the database:", err);
//         return;
//     }
//     console.log("Connected to the database");
//     connection.release();
// });

// module.exports = pool;