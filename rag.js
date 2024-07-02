import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { readFile } from "fs/promises";
import readline from "node:readline";
import OpenAI from "openai";

const openai = new OpenAI();

async function readJsonFile(fileName) {
    try {
        const data = await readFile(fileName, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading file:", error);
    }
}

const products = await readJsonFile("./products.json");

function createStore() {
    const embeddings = new OpenAIEmbeddings();
    return MemoryVectorStore.fromDocuments(
        products.map(
            (product) =>
                new Document({
                    pageContent: `Title: ${product.name}\n${product.description}\n${product.price}`,
                    metadata: { sourceId: product.id, title: product.name },
                })
        ),
        embeddings
    );
}

const store = await createStore();

async function searchDocuments(query, count = 1) {
    return store.similaritySearch(query, count);
}

async function getProducts(query, count = 1) {
    const searchResults = await searchDocuments(query, count);

    return searchResults.map((result) => {
        return products.find((product) => product.id === result.metadata.sourceId);
    });
}

async function generateResponse(products, question, chatHistory) {
    const context = products.map((p) => `${p.name}: ${p.description}`).join("\n");

    const userQueryWithContext = `Question: ${question}\n\nContext:\n${context}`;

    chatHistory.push({
        role: "user",
        content: userQueryWithContext,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0,
        messages: chatHistory,
        max_tokens: 1500,
    });

    const aiResponseMessage = response.choices[0].message.content;

    chatHistory.push({
        role: "assistant",
        content: aiResponseMessage,
    });

    return aiResponseMessage;
}

async function searchLoop() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query) =>
        new Promise((resolve) => rl.question(query, resolve));

    const chatHistory = [
        {
            role: "system",
            content: `You are helpful assistant to the product search chatbot!
           Please answer the user's questions about products.
           But do not answer questions that are not about products.
           If needed, you can ask the user for more information.
           Do not make up information, only answer questions about products that are in the database.`,
        },
    ];

    while (true) {
        const query = await askQuestion(
            'Enter your question about products (or type "exit" to quit): '
        );

        if (query.toLowerCase() === "exit") {
            break;
        }

        const products = await getProducts(query, 3);

        if (products.length === 0) {
            console.log("No relevant products found.");
        } else {
            const answer = await generateResponse(products, query, chatHistory);
            console.log("Answer:", answer);
        }
    }

    rl.close();
}

await searchLoop();
