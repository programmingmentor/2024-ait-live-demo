import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { readFile } from "fs/promises";
import readline from "node:readline";


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

async function searchLoop() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query) =>
        new Promise((resolve) => rl.question(query, resolve));

    while (true) {
        const query = await askQuestion(
            'Enter your search query (or type "exit" to quit): '
        );

        if (query.toLowerCase() === "exit") {
            break;
        }

        const products = await getProducts(query, 3);

        if (products.length === 0) {
            console.log("No products found for your query.");
        } else {
            console.log("Products found:");
            products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name}: ${product.description}`);
            });
        }
    }

    rl.close();
}

await searchLoop();
