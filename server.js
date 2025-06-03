const express = require('express');
require('dotenv').config();
const app_routing = require('./modules/app-routing');
const cors = require('cors');

const app = express();
const port = process.env.port || 3000;


// Use express.json() to parse JSON bodies
app.use(express.text({ type: 'text/plain' }));
// app.use(express.json());


app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'api-key', 'token'],

}));

app.use('/', require('./middlewares/validators').extractHeaderLanguage);
// app.use('/', require('./middlewares/validators').validateApiKey);
// app.use('/', require('./middlewares/validators').validateJwtToken); 
// app.use('/', require('./middlewares/validators').validateAdmin); 
app.use('/', require('./utilities/common').decodeBody);

app_routing.v1(app);

app.listen(port, () => {
    console.log("Server running on port :", port);
});