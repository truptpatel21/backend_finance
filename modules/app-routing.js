class Routing {
    v1(app){
        const routers = require('./v1/routers/route');
        app.use('/v1',routers);
    }

}

module.exports = new Routing();
