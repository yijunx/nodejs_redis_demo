const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');


const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;

// well this is how to connect to redis in a docker compose
const client = redis.createClient(`//redis:${REDIS_PORT}`);


const app = express();


// Set response
function setResponse(username, repos) {
    return `<h2>${username} has ${repos} public github repos`
}


// Make request to github for data
async function getRepos(req, res, next) {
    try {
        console.log('Fetching data...');
        const { username } = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();

        const repos = data.public_repos;

        // set data to redis cache
        client.setex(username, 3600, repos);


        res.send(setResponse(username, repos))
    } catch (err) {
        console.error(err);
        res.status(500);
    }
}


// Cache middleware
function cache(req, res, next) {
    const { username } = req.params;

    client.get(username, (err, data) => {
        if (err) throw err;  // got error

        if (data !== null) { // get data from redis
            res.send(setResponse(username, data))
        } else {  // no data in redis
            next(); // continue...
        }
    })
}


app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
    console.log(`app listenning on port ${PORT}`)
});
