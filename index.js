const express = require('express');
const line = require('@line/bot-sdk');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

// create LINE SDK config from env variables
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const lineClient = new line.Client(lineConfig);

// create Express app
const app = express();

// register a webhook handler with LINE middleware
app.post('/callback', line.middleware(lineConfig), async (req, res) => {

    console.log('request-body : ', req.body.events);

    Promise.all(req.body.events.map(handleEvent2))
        .then(() => res.sendStatus(200))
        .catch((error) => {
            // console.error('Error from Axios:', error);
            // console.error('Original error:', error.originalError);
            res.sendStatus(500);
        });
});


async function handleEvent2(event) {
    if (event.type === 'message' && event.message.type === 'text') {

        const messageText = event.message.text;
        const replyToken = event.replyToken;
        const userId = event.source.userId;

        const aiResponse = await processMessage(userId, messageText);

        const message = {
            type: 'text',
            text: aiResponse,
        };
        await lineClient.replyMessage(replyToken, message);
    }
}


// create a map to store user data and messages
const userMap = new Map();

async function processMessage(username, messageText) {
    // get user object from map or create new user object with empty message array
    let user = userMap.get(username) || { userId: Math.floor(Math.random() * 1000000), messages: [] };

    // clear messages if messageText is '/reset'
    if (messageText === '/:reset') {
        user.messages = [];
        userMap.set(username, user);
        messageText = "Start new Conversation"
    } else if (messageText === '/:japanese') {
        user.messages = [];
        userMap.set(username, user);
        messageText = "Start replying in japanese from now on"
    } else if (messageText === '/:english') {
        user.messages = [];
        userMap.set(username, user);
        messageText = "Start replying in English from now on"
    }

    // create a new message object
    const newMessage = {
        content: messageText,
        role: "user",
    };

    // if the user has no previous messages, add greeting message
    if (user.messages.length === 0) {
        const greeting = {
            content: 'Hello There, How Can I Help You?',
            role: 'assistant',
        }
        user.messages.push(greeting);
    }

    // push the message to the user's message array
    user.messages.push(newMessage);

    // update user object in map
    userMap.set(username, user);

    // log userId and messages to console
    console.log(user);
    // console.log(messages);

    const apiResponse = await getAIResponse(user);
    return apiResponse;
}


async function getAIResponse(user) {

    const msg = user.messages;

    const systemMessage = {
        role: "system",
        content: `You are ENKI an assistant named after the Anunaki god of knowledge and wisdom to help users`
    }

    const apiRequestBody = {
        "model": "gpt-3.5-turbo",
        "messages": [
            systemMessage,
            ...msg  //[message1, message2, message3]
        ],
        "temperature": 0.5,
    }



    const aiEndpoint = 'https://api.openai.com/v1/chat/completions';
    const aiApiKey = process.env.OPENAI_API_KEY;
    try {
        const response = await fetch(aiEndpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${aiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiRequestBody),
        });

        const data = await response.json();
        const responseMessage = data.choices[0].message.content;


        // console.log('AI response: ' + responseMessage);

        const aiResponseMessages = {
            content: responseMessage,
            role: 'assistant',
        };


        msg.push(aiResponseMessages);


        return responseMessage;



    } catch (error) {
        console.error(`Error getting AI response: ${error.message}`);
    }

}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});






