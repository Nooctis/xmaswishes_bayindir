// client.js
const axios = require('axios');
const Promise = require('bluebird');

const API_URL = 'http://localhost:3000/api/wishes';
const NUM_REQUESTS = 500; // Gesamtanzahl der Anfragen
const CONCURRENCY = 50; 

const submitWish = async () => {
    try {
        const response = await axios.post(API_URL, {
            name: `User${Math.random().toString(36).substring(7)}`,
            wish: 'Ein Fahrrad'
        });
        return response.status;
    } catch (error) {
        return error.response ? error.response.status : 500;
    }
};

const getWishes = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.status;
    } catch (error) {
        return error.response ? error.response.status : 500;
    }
};

const runTest = async () => {
    let successfulRequests = 0;
    let failedRequests = 0;
    const startTime = Date.now();

    const tasks = [];

    for (let i = 0; i < NUM_REQUESTS; i++) {
        if (i % 2 === 0) {
            tasks.push(submitWish());
        } else {
            tasks.push(getWishes());
        }
    }

    const results = await Promise.map(tasks, task => task, { concurrency: CONCURRENCY });

    results.forEach(status => {
        if (status === 200 || status === 201) {
            successfulRequests++;
        } else {
            failedRequests++;
        }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Sekunden
    const rps = NUM_REQUESTS / duration;

    console.log(`Erfolgreiche Anfragen: ${successfulRequests}`);
    console.log(`Fehlgeschlagene Anfragen: ${failedRequests}`);
    console.log(`Dauer: ${duration.toFixed(2)} Sekunden`);
    console.log(`Gesamte API Calls pro Sekunde: ${rps.toFixed(2)}`);
};

runTest();
