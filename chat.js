import { channel } from "node:diagnostics_channel";
import readline from "node:readline";
import OpenAI from "openai";

const openai = new OpenAI();

async function generateResponse(question, chatHistory) {

    chatHistory.push({
        role: "user",
        content: question
    });
    
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0,
        messages: chatHistory,
        max_tokens: 1500
    });
    
    const aiResponseMessage = response.choices[0].message.content;
    
    chatHistory.push({
        role: "assistant",
        content: aiResponseMessage
    });

    return aiResponseMessage;
}

async function chatLoop() {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    }); 

    const askQuestion = (query) =>
        new Promise((resolve) => rl.question(query, resolve));


    const chatHistory = [
        {
            role: "system",
            content: "You are helpful AI assistant, please follow instructions. Please make you answers fun"
        }
    ];

    while (true) {
        const question = await askQuestion('Please ask question (type "exit" to quit)> ');
        if (question.toLowerCase() === 'exit') break;
        const answer = await generateResponse(question, chatHistory);
        console.log(answer);
    }    
    rl.close();
}

await chatLoop();
